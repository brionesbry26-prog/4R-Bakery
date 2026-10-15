from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select

import crud
import main
from config import Settings, get_settings
from database import SessionLocal, make_engine
from models import Order, OrderItem, OrderStatus, Product
from schemas import normalize_ph_phone

PHONE = "0917 123 4567"


def future_pickup(days: int = 2, hhmm: str = "10:00") -> dict:
    return {"pickup_date": (date.today() + timedelta(days=days)).isoformat(), "pickup_time": hhmm}


def product_id(client, name: str) -> int:
    items = client.get("/api/bakery/products", params={"search": name}).json()["items"]
    return next(p["id"] for p in items if p["name"] == name)


def order_payload(client, items=None, **overrides) -> dict:
    payload = {
        "customer": {"full_name": "Juan Dela Cruz", "phone": PHONE, "email": None},
        "items": items if items is not None else [{"product_id": product_id(client, "Pandesal"), "quantity": 10}],
        **future_pickup(),
        "notes": "Please prepare fresh pandesal.",
    }
    payload.update(overrides)
    return payload


# --- Health & info -----------------------------------------------------------


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_readiness(client):
    r = client.get("/api/health/ready")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "database": "ok"}


def test_bakery_info_does_not_invent_contact_details(client):
    r = client.get("/api/bakery/info")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "4R Bakery"
    assert "Bachawan" in body["address"]
    assert body["phone"] is None
    assert body["operating_hours"] is None
    assert body["map_url"].startswith("https://www.google.com/maps/search/")
    assert body["pickup"]["timezone"] == "Asia/Manila"


def test_openapi_docs_available(client):
    assert client.get("/docs").status_code == 200
    spec = client.get("/openapi.json").json()
    assert "/api/bakery/orders" in spec["paths"]


# --- Products ----------------------------------------------------------------


def test_list_products_seeded(client):
    r = client.get("/api/bakery/products")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 8
    assert set(body["categories"]) == {"Breads", "Pastries", "Cakes"}
    pandesal = next(p for p in body["items"] if p["name"] == "Pandesal")
    assert pandesal["price"] == "3.00"  # money serialized as a 2-dp string
    assert pandesal["stock_quantity"] is None


def test_seeding_is_idempotent(client, db):
    from seed import seed_products

    assert seed_products(db) == 0
    assert client.get("/api/bakery/products").json()["total"] == 8


def test_filter_by_category_and_search(client):
    cakes = client.get("/api/bakery/products", params={"category": "cakes"}).json()
    assert cakes["total"] == 2 and all(p["category"] == "Cakes" for p in cakes["items"])
    found = client.get("/api/bakery/products", params={"search": "pandesal"}).json()
    assert [p["name"] for p in found["items"]] == ["Pandesal"]
    none = client.get("/api/bakery/products", params={"search": "pizza"}).json()
    assert none["total"] == 0 and none["items"] == []


def test_sorting_and_pagination(client):
    prices = [Decimal(p["price"]) for p in client.get("/api/bakery/products?sort_by=price").json()["items"]]
    assert prices == sorted(prices)
    names = [p["name"] for p in client.get("/api/bakery/products?sort_by=-name").json()["items"]]
    assert names == sorted(names, reverse=True)
    page = client.get("/api/bakery/products?sort_by=name&limit=3&offset=3").json()
    assert len(page["items"]) == 3 and page["total"] == 8


@pytest.mark.parametrize("query", ["sort_by=bogus", "limit=0", "limit=1000", "offset=-1"])
def test_invalid_query_params(client, query):
    assert client.get(f"/api/bakery/products?{query}").status_code == 422


def test_product_detail_and_404(client):
    pid = product_id(client, "Ensaymada")
    r = client.get(f"/api/bakery/products/{pid}")
    assert r.status_code == 200 and r.json()["name"] == "Ensaymada"
    assert client.get("/api/bakery/products/99999").status_code == 404
    assert client.get("/api/bakery/products/abc").status_code == 422
    assert client.get("/api/bakery/products/0").status_code == 422


# --- Order creation ------------------------------------------------------------


def test_create_order_success_and_server_side_pricing(client, db):
    pandesal = product_id(client, "Pandesal")
    ensaymada = product_id(client, "Ensaymada")
    payload = order_payload(
        client,
        items=[{"product_id": pandesal, "quantity": 10}, {"product_id": ensaymada, "quantity": 3}],
    )
    # Client-supplied totals/prices must be rejected rather than trusted.
    tampered = {**payload, "total": "1.00"}
    assert client.post("/api/bakery/orders", json=tampered).status_code == 422

    r = client.post("/api/bakery/orders", json=payload)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "pending"
    assert body["status_label"] == "Pending"
    assert "pending bakery confirmation" in body["message"]
    assert body["reference"].startswith("4R-") and len(body["reference"]) == 12
    assert body["subtotal"] == "105.00"  # 10 x 3.00 + 3 x 25.00
    assert body["total"] == "105.00"
    assert body["customer_phone_masked"] == "+639*****567"
    assert body["pickup_time"] == "10:00"

    order = db.scalar(select(Order).where(Order.reference == body["reference"]))
    assert order.customer_phone == "+639171234567"
    assert order.total == Decimal("105.00")
    assert len(order.items) == 2


def test_duplicate_product_lines_are_merged(client):
    pid = product_id(client, "Pandesal")
    payload = order_payload(client, items=[{"product_id": pid, "quantity": 2}, {"product_id": pid, "quantity": 3}])
    body = client.post("/api/bakery/orders", json=payload).json()
    assert len(body["items"]) == 1 and body["items"][0]["quantity"] == 5
    assert body["total"] == "15.00"


def test_historical_price_preserved(client, db):
    pid = product_id(client, "Spanish Bread")
    body = client.post("/api/bakery/orders", json=order_payload(client, items=[{"product_id": pid, "quantity": 2}])).json()
    product = db.get(Product, pid)
    product.price = Decimal("12.00")
    db.commit()
    item = db.scalar(select(OrderItem).join(Order).where(Order.reference == body["reference"]))
    assert item.unit_price == Decimal("8.00") and item.line_subtotal == Decimal("16.00")


@pytest.mark.parametrize(
    "mutate, fragment",
    [
        (lambda p: p.update(items=[]), "at least 1"),
        (lambda p: p["items"][0].update(quantity=0), "greater than 0"),
        (lambda p: p["items"][0].update(quantity=-4), "greater than 0"),
        (lambda p: p["customer"].update(full_name=""), ""),
        (lambda p: p["customer"].update(full_name="12345"), "letters"),
        (lambda p: p["customer"].update(phone="12345"), ""),
        (lambda p: p["customer"].update(phone="0817 123 4567"), "Philippine mobile"),
        (lambda p: p["customer"].update(email="not-an-email"), "email"),
        (lambda p: p.update(notes="x" * 501), "500"),
        (lambda p: p.update(pickup_date="not-a-date"), "date"),
    ],
)
def test_invalid_payloads(client, mutate, fragment):
    payload = order_payload(client)
    mutate(payload)
    r = client.post("/api/bakery/orders", json=payload)
    assert r.status_code == 422, r.text
    body = r.json()
    assert body["errors"]
    assert fragment.lower() in r.text.lower()


def test_past_pickup_rejected(client):
    payload = order_payload(client, **future_pickup(days=-1))
    r = client.post("/api/bakery/orders", json=payload)
    assert r.status_code == 422 and "future" in r.json()["detail"]


def test_pickup_too_far_ahead_rejected(client):
    r = client.post("/api/bakery/orders", json=order_payload(client, **future_pickup(days=365)))
    assert r.status_code == 422 and "in advance" in r.json()["detail"]


def test_pickup_window_enforced_when_configured():
    cfg = Settings(pickup_open_time="06:00", pickup_close_time="18:00")
    tomorrow = date.today() + timedelta(days=2)
    from datetime import time

    with pytest.raises(crud.OrderValidationError, match="between"):
        crud.validate_pickup(tomorrow, time(19, 0), cfg)
    crud.validate_pickup(tomorrow, time(9, 0), cfg)


def test_lead_time_enforced():
    from datetime import time

    cfg = Settings(min_pickup_lead_minutes=120)
    now = datetime(2026, 12, 1, 9, 0, tzinfo=cfg.tz)
    with pytest.raises(crud.OrderValidationError, match="at least 120"):
        crud.validate_pickup(date(2026, 12, 1), time(10, 0), cfg, now=now)
    crud.validate_pickup(date(2026, 12, 1), time(11, 30), cfg, now=now)


def test_nonexistent_product_rejected(client, db):
    before = db.scalar(select(Order.id).order_by(Order.id.desc()))
    r = client.post("/api/bakery/orders", json=order_payload(client, items=[{"product_id": 9999, "quantity": 1}]))
    assert r.status_code == 422 and "not found" in r.json()["detail"]
    assert db.scalar(select(Order.id).order_by(Order.id.desc())) == before


def test_unavailable_product_rejected(client):
    pid = product_id(client, "Special Occasion Cake")
    r = client.post("/api/bakery/orders", json=order_payload(client, items=[{"product_id": pid, "quantity": 1}]))
    assert r.status_code == 409 and "unavailable" in r.json()["detail"]


def test_quantity_limit(client):
    pid = product_id(client, "Pandesal")
    r = client.post("/api/bakery/orders", json=order_payload(client, items=[{"product_id": pid, "quantity": 501}]))
    assert r.status_code == 422 and "Maximum" in r.json()["detail"]


def test_oversized_body_rejected(client):
    r = client.post(
        "/api/bakery/orders",
        content=b"{" + b" " * 40_000 + b"}",
        headers={"Content-Type": "application/json"},
    )
    assert r.status_code == 413


# --- Idempotency -----------------------------------------------------------------


def test_duplicate_submission_with_same_idempotency_key(client, db):
    payload = order_payload(client)
    headers = {"Idempotency-Key": "checkout-abc-12345"}
    first = client.post("/api/bakery/orders", json=payload, headers=headers)
    second = client.post("/api/bakery/orders", json=payload, headers=headers)
    assert first.status_code == 201 and second.status_code == 200
    assert first.json()["reference"] == second.json()["reference"]
    count = len(db.scalars(select(Order).where(Order.idempotency_key == "checkout-abc-12345")).all())
    assert count == 1


def test_idempotency_key_reuse_by_other_customer_conflicts(client):
    headers = {"Idempotency-Key": "checkout-xyz-12345"}
    assert client.post("/api/bakery/orders", json=order_payload(client), headers=headers).status_code == 201
    other = order_payload(client)
    other["customer"]["phone"] = "09181234567"
    assert client.post("/api/bakery/orders", json=other, headers=headers).status_code == 409


def test_without_idempotency_key_creates_distinct_orders(client):
    a = client.post("/api/bakery/orders", json=order_payload(client)).json()["reference"]
    b = client.post("/api/bakery/orders", json=order_payload(client)).json()["reference"]
    assert a != b


# --- Order lookup access control ------------------------------------------------


def test_order_lookup_requires_matching_phone(client):
    ref = client.post("/api/bakery/orders", json=order_payload(client)).json()["reference"]
    ok = client.get(f"/api/bakery/orders/{ref}", headers={"X-Contact-Phone": "+63 917 123 4567"})
    assert ok.status_code == 200 and ok.json()["reference"] == ref
    lower = client.get(f"/api/bakery/orders/{ref.lower()}", headers={"X-Contact-Phone": PHONE})
    assert lower.status_code == 200

    wrong = client.get(f"/api/bakery/orders/{ref}", headers={"X-Contact-Phone": "09999999999"})
    unknown = client.get("/api/bakery/orders/4R-AAAA-AAAA", headers={"X-Contact-Phone": PHONE})
    assert wrong.status_code == unknown.status_code == 404
    assert wrong.json() == unknown.json()  # indistinguishable responses
    assert client.get(f"/api/bakery/orders/{ref}").status_code == 422  # header required


def test_no_unrestricted_order_listing(client):
    assert client.get("/api/bakery/orders").status_code in (404, 405)


def test_status_update_visible_to_customer(client, db):
    ref = client.post("/api/bakery/orders", json=order_payload(client)).json()["reference"]
    crud.set_order_status(db, ref, OrderStatus.READY_FOR_PICKUP)
    body = client.get(f"/api/bakery/orders/{ref}", headers={"X-Contact-Phone": PHONE}).json()
    assert body["status"] == "ready_for_pickup" and body["status_label"] == "Ready for Pickup"


# --- Persistence & transactions ---------------------------------------------------


def test_order_persists_across_new_engine(client, db_path):
    ref = client.post("/api/bakery/orders", json=order_payload(client)).json()["reference"]
    # Simulate a backend restart: a brand new engine/connection pool on the same file.
    fresh = make_engine(f"sqlite:///{db_path}")
    from sqlalchemy.orm import Session

    with Session(fresh) as s:
        order = s.scalar(select(Order).where(Order.reference == ref))
        assert order is not None and order.status == OrderStatus.PENDING
        assert len(s.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all()) == 1
    fresh.dispose()


def test_inventory_tracking_prevents_overselling_and_rolls_back(client, db):
    main.app.dependency_overrides[get_settings] = lambda: Settings(inventory_tracking=True)
    pandesal = product_id(client, "Pandesal")
    ensaymada = product_id(client, "Ensaymada")
    db.get(Product, pandesal).stock_quantity = 20
    db.get(Product, ensaymada).stock_quantity = 1
    db.commit()

    # Second line fails -> whole transaction rolls back, pandesal stock untouched.
    r = client.post(
        "/api/bakery/orders",
        json=order_payload(
            client,
            items=[{"product_id": pandesal, "quantity": 5}, {"product_id": ensaymada, "quantity": 2}],
        ),
    )
    assert r.status_code == 409 and "Not enough" in r.json()["detail"]
    db.expire_all()
    assert db.get(Product, pandesal).stock_quantity == 20

    ok = client.post("/api/bakery/orders", json=order_payload(client, items=[{"product_id": pandesal, "quantity": 20}]))
    assert ok.status_code == 201
    db.expire_all()
    assert db.get(Product, pandesal).stock_quantity == 0
    detail = client.get(f"/api/bakery/products/{pandesal}").json()
    assert detail["stock_quantity"] == 0 and detail["is_available"] is False


# --- Units -------------------------------------------------------------------------


@pytest.mark.parametrize(
    "raw, expected",
    [("09171234567", "+639171234567"), ("+63 917-123-4567", "+639171234567"), ("639171234567", "+639171234567")],
)
def test_phone_normalization(raw, expected):
    assert normalize_ph_phone(raw) == expected


def test_reference_format_and_uniqueness():
    refs = {crud.generate_reference() for _ in range(2000)}
    assert len(refs) == 2000
    assert all(r.startswith("4R-") and len(r) == 12 for r in refs)


def test_rate_limiter():
    limiter = main.RateLimiter(3)
    assert [limiter.check("ip") for _ in range(4)] == [True, True, True, False]
    assert limiter.check("other-ip")


def test_internal_errors_do_not_leak_details(client, monkeypatch):
    def boom(*_a, **_k):
        raise RuntimeError("secret database detail")

    monkeypatch.setattr(crud, "list_products", boom)
    c = __import__("fastapi.testclient", fromlist=["TestClient"]).TestClient(main.app, raise_server_exceptions=False)
    r = c.get("/api/bakery/products")
    assert r.status_code == 500 and "secret" not in r.text
