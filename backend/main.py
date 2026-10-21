"""4R Bakery REST API.

Run locally:  uvicorn main:app --reload --host 0.0.0.0 --port 8000
Docs:         http://localhost:8000/docs
"""

import logging
import threading
import time
from pathlib import Path as FsPath
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from typing import Annotated
from urllib.parse import quote_plus

from fastapi import Depends, FastAPI, Header, HTTPException, Path, Query, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import crud
from config import Settings, get_settings
from database import SessionLocal, get_db, init_db
from schemas import (
    BakeryInfo,
    ErrorOut,
    HealthOut,
    OrderCreate,
    OrderOut,
    PickupRules,
    ProductList,
    ProductOut,
    ReadinessOut,
    SocialLinks,
    SortBy,
    normalize_ph_phone,
)
from seed import seed_products

API_VERSION = "1.0.0"
STATIC_DIR = FsPath(__file__).parent / "static"
# The customer website (../web). Served at "/" so one `uvicorn` command runs everything.
WEB_DIR = FsPath(__file__).resolve().parent.parent / "web"

settings = get_settings()
logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("bakery.api")


def prepare_database() -> None:
    """Create tables and seed sample products. Safe to call repeatedly and
    concurrently (serverless cold starts may run it in parallel)."""
    try:
        init_db()
    except Exception:  # a parallel cold start may be creating the same tables
        time.sleep(1)
        init_db()
    if settings.seed_sample_products:
        with SessionLocal() as db:
            try:
                created = seed_products(db)
            except IntegrityError:
                db.rollback()  # another instance seeded at the same moment
                created = 0
            if created:
                logger.info("Seeded %d sample product(s)", created)
    if settings.database_url.startswith("sqlite:////tmp/"):
        logger.warning("Using a temporary SQLite database: orders will NOT persist. Set DATABASE_URL to Postgres.")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    prepare_database()
    yield


app = FastAPI(
    title="4R Bakery API",
    version=API_VERSION,
    description=(
        "REST API for the 4R Bakery customer app (Brgy. Bachawan, San Agustin, Romblon). "
        "Provides bakery information, the product catalog, and pre-order requests. "
        "Submitted pre-orders start as **pending** until the bakery confirms them; no payment is processed."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Idempotency-Key", "X-Contact-Phone"],
)

# Product photos uploaded by the bakery. Read-only filesystems (serverless) can't create it.
try:
    STATIC_DIR.mkdir(exist_ok=True)
except OSError:
    pass
if STATIC_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# --------------------------------------------------------------------------
# Middleware & error handling
# --------------------------------------------------------------------------


@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > settings.max_request_body_bytes:
        return JSONResponse(status_code=413, content={"detail": "Request body is too large."})
    return await call_next(request)


class RateLimiter:
    """Small in-process sliding-window limiter.

    Suitable for a single-instance deployment. Behind multiple workers or a
    load balancer, enforce limits at the proxy or with a shared store (Redis).
    """

    def __init__(self, per_minute: int):
        self.per_minute = per_minute
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str) -> bool:
        if self.per_minute <= 0:
            return True
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > 60:
                hits.popleft()
            if len(hits) >= self.per_minute:
                return False
            hits.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


order_rate_limiter = RateLimiter(settings.order_rate_limit_per_minute)
lookup_rate_limiter = RateLimiter(settings.lookup_rate_limit_per_minute)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    # Return field errors without echoing the submitted input back.
    errors = []
    for err in exc.errors():
        loc = [str(p) for p in err.get("loc", []) if p != "body"]
        msg = str(err.get("msg", "Invalid value")).removeprefix("Value error, ")
        errors.append({"field": ".".join(loc), "message": msg})
    first = errors[0]["message"] if errors else "Invalid request."
    return JSONResponse(status_code=422, content={"detail": first, "errors": errors})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    logger.exception("Unhandled error: %s", type(exc).__name__)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on our side. Please try again."})


# --------------------------------------------------------------------------
# Health
# --------------------------------------------------------------------------


@app.get("/api/health", response_model=HealthOut, tags=["Health"], summary="Service liveness check")
def health() -> HealthOut:
    return HealthOut(status="ok", service="4r-bakery-api", version=API_VERSION)


@app.get(
    "/api/health/ready",
    response_model=ReadinessOut,
    tags=["Health"],
    summary="Readiness check including database connectivity",
    responses={503: {"model": ReadinessOut}},
)
def readiness(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(status_code=503, content={"status": "unavailable", "database": "error"})
    return ReadinessOut(status="ok", database="ok")


# --------------------------------------------------------------------------
# Bakery information
# --------------------------------------------------------------------------


@app.get("/api/bakery/info", response_model=BakeryInfo, tags=["Bakery"], summary="Bakery profile and contact details")
def bakery_info(cfg: Settings = Depends(get_settings)) -> BakeryInfo:
    map_url = cfg.bakery_map_url or (
        "https://www.google.com/maps/search/?api=1&query=" + quote_plus(f"{cfg.bakery_name}, {cfg.bakery_address}")
    )
    return BakeryInfo(
        name=cfg.bakery_name,
        description=cfg.bakery_description,
        address=cfg.bakery_address,
        operating_hours=cfg.bakery_hours or None,
        phone=cfg.bakery_phone or None,
        email=cfg.bakery_email or None,
        social_links=SocialLinks(
            facebook=cfg.bakery_facebook_url or None,
            instagram=cfg.bakery_instagram_url or None,
        ),
        map_url=map_url,
        currency=cfg.currency,
        inventory_tracking=cfg.inventory_tracking,
        pickup=PickupRules(
            timezone=cfg.bakery_timezone,
            min_lead_minutes=cfg.min_pickup_lead_minutes,
            max_advance_days=cfg.max_pickup_advance_days,
            open_time=cfg.pickup_open_time or None,
            close_time=cfg.pickup_close_time or None,
            max_items_per_order=cfg.max_items_per_order,
            max_quantity_per_item=cfg.max_quantity_per_item,
        ),
    )


# --------------------------------------------------------------------------
# Products
# --------------------------------------------------------------------------


def _product_out(product, cfg: Settings) -> ProductOut:
    out = ProductOut.model_validate(product)
    if not cfg.inventory_tracking:
        out.stock_quantity = None
    elif product.stock_quantity is not None and product.stock_quantity <= 0:
        out.is_available = False
    return out


@app.get("/api/bakery/products", response_model=ProductList, tags=["Products"], summary="List products")
def list_products(
    category: Annotated[str | None, Query(max_length=60, description="Exact category name, case-insensitive")] = None,
    search: Annotated[str | None, Query(max_length=80, description="Matches name or description")] = None,
    sort_by: Annotated[SortBy, Query(description="name, -name, price, -price, or featured")] = "featured",
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0, le=10_000)] = 0,
    db: Session = Depends(get_db),
    cfg: Settings = Depends(get_settings),
) -> ProductList:
    items, total = crud.list_products(db, category=category, search=search, sort_by=sort_by, limit=limit, offset=offset)
    return ProductList(
        items=[_product_out(p, cfg) for p in items],
        total=total,
        limit=limit,
        offset=offset,
        categories=crud.list_categories(db),
    )


@app.get(
    "/api/bakery/products/{product_id}",
    response_model=ProductOut,
    tags=["Products"],
    summary="Get a single product",
    responses={404: {"model": ErrorOut}},
)
def get_product(
    product_id: Annotated[int, Path(gt=0)],
    db: Session = Depends(get_db),
    cfg: Settings = Depends(get_settings),
) -> ProductOut:
    product = crud.get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    return _product_out(product, cfg)


# --------------------------------------------------------------------------
# Orders
# --------------------------------------------------------------------------


@app.post(
    "/api/bakery/orders",
    response_model=OrderOut,
    status_code=status.HTTP_201_CREATED,
    tags=["Orders"],
    summary="Submit a pre-order request",
    description=(
        "Creates a pre-order with status `pending`. Prices and totals are computed on the server from the "
        "current catalog; any client-side totals are ignored. Send a unique `Idempotency-Key` header per "
        "checkout attempt so retries never create duplicate orders (a replay returns the original order with 200)."
    ),
    responses={409: {"model": ErrorOut}, 422: {"model": ErrorOut}, 429: {"model": ErrorOut}},
)
def create_order(
    payload: OrderCreate,
    request: Request,
    response: Response,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key", min_length=8, max_length=64)] = None,
    db: Session = Depends(get_db),
    cfg: Settings = Depends(get_settings),
) -> OrderOut:
    if not order_rate_limiter.check(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many order requests. Please wait a minute and try again.")
    try:
        order, created = crud.create_order(db, payload, cfg, idempotency_key=idempotency_key)
    except crud.OrderValidationError as exc:
        content = {"detail": exc.message}
        if exc.field:
            content["errors"] = [{"field": exc.field, "message": exc.message}]
        return JSONResponse(status_code=exc.status_code, content=content)
    if not created:
        response.status_code = status.HTTP_200_OK
    return crud.order_to_schema(order, cfg)


@app.get(
    "/api/bakery/orders/{order_reference}",
    response_model=OrderOut,
    tags=["Orders"],
    summary="Look up a pre-order (reference + contact number)",
    description=(
        "Returns an order only when the `X-Contact-Phone` header matches the number used when ordering. "
        "References are random (not sequential) and mismatches return the same 404 as unknown references, "
        "so orders cannot be enumerated. The phone is sent as a header to keep it out of URL/access logs."
    ),
    responses={404: {"model": ErrorOut}},
)
def get_order(
    order_reference: Annotated[str, Path(min_length=6, max_length=32, pattern=r"^[A-Za-z0-9-]+$")],
    request: Request,
    contact_phone: Annotated[str, Header(alias="X-Contact-Phone", min_length=10, max_length=20)],
    db: Session = Depends(get_db),
    cfg: Settings = Depends(get_settings),
) -> OrderOut:
    if not lookup_rate_limiter.check(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many lookups. Please wait a minute and try again.")
    not_found = HTTPException(status_code=404, detail="No order matches that reference and contact number.")
    try:
        phone = normalize_ph_phone(contact_phone)
    except ValueError:
        raise not_found
    order = crud.get_order_for_customer(db, order_reference, phone)
    if order is None:
        raise not_found
    return crud.order_to_schema(order, cfg)


# --------------------------------------------------------------------------
# Customer website
# --------------------------------------------------------------------------
# Mounted last so every /api, /docs and /static route above takes precedence.
if WEB_DIR.is_dir() and settings.serve_website:
    app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="website")
