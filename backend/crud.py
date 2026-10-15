"""Database operations and business rules."""

import logging
import secrets
from datetime import date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from config import Settings
from models import Order, OrderItem, OrderStatus, Product
from schemas import STATUS_LABELS, STATUS_MESSAGES, OrderCreate, OrderOut, OrderItemOut, mask_phone

logger = logging.getLogger("bakery.crud")

CENT = Decimal("0.01")

# Unambiguous characters (no 0/O, 1/I/L) keep references easy to read aloud.
_REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


class OrderValidationError(Exception):
    """Raised when an order request breaks a business rule (HTTP 422/409)."""

    def __init__(self, message: str, *, status_code: int = 422, field: str | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.field = field


# --------------------------------------------------------------------------
# Products
# --------------------------------------------------------------------------


def list_products(
    db: Session,
    *,
    category: str | None = None,
    search: str | None = None,
    sort_by: str = "featured",
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Product], int]:
    stmt = select(Product)
    if category:
        stmt = stmt.where(func.lower(Product.category) == category.strip().lower())
    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(or_(func.lower(Product.name).like(term), func.lower(Product.description).like(term)))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    ordering = {
        "name": [Product.name.asc()],
        "-name": [Product.name.desc()],
        "price": [Product.price.asc(), Product.name.asc()],
        "-price": [Product.price.desc(), Product.name.asc()],
        "featured": [Product.is_featured.desc(), Product.category.asc(), Product.name.asc()],
    }[sort_by]
    items = db.scalars(stmt.order_by(*ordering).limit(limit).offset(offset)).all()
    return list(items), total


def list_categories(db: Session) -> list[str]:
    return list(db.scalars(select(Product.category).distinct().order_by(Product.category)).all())


def get_product(db: Session, product_id: int) -> Product | None:
    return db.get(Product, product_id)


# --------------------------------------------------------------------------
# Orders
# --------------------------------------------------------------------------


def generate_reference() -> str:
    """e.g. 4R-7KQ9-M2XD — 31^8 (~8.5e11) combinations, not sequential."""
    body = "".join(secrets.choice(_REF_ALPHABET) for _ in range(8))
    return f"4R-{body[:4]}-{body[4:]}"


def _parse_hhmm(value: str) -> time:
    hours, minutes = value.split(":")
    return time(int(hours), int(minutes))


def validate_pickup(pickup_date: date, pickup_time: time, settings: Settings, *, now: datetime | None = None) -> None:
    tz = settings.tz
    now = (now or datetime.now(tz)).astimezone(tz)
    pickup_at = datetime.combine(pickup_date, pickup_time.replace(tzinfo=None), tzinfo=tz)

    if pickup_at <= now:
        raise OrderValidationError("Pickup date and time must be in the future.", field="pickup_date")
    if pickup_at < now + timedelta(minutes=settings.min_pickup_lead_minutes):
        raise OrderValidationError(
            f"Please allow at least {settings.min_pickup_lead_minutes} minutes for the bakery to prepare your order.",
            field="pickup_time",
        )
    if pickup_date > (now + timedelta(days=settings.max_pickup_advance_days)).date():
        raise OrderValidationError(
            f"Pickup can be scheduled up to {settings.max_pickup_advance_days} days in advance.",
            field="pickup_date",
        )
    if settings.pickup_open_time and settings.pickup_close_time:
        opens, closes = _parse_hhmm(settings.pickup_open_time), _parse_hhmm(settings.pickup_close_time)
        t = pickup_time.replace(tzinfo=None, second=0, microsecond=0)
        if not (opens <= t <= closes):
            raise OrderValidationError(
                f"Pickup time must be between {settings.pickup_open_time} and {settings.pickup_close_time}.",
                field="pickup_time",
            )


def _merge_items(payload: OrderCreate) -> dict[int, int]:
    merged: dict[int, int] = {}
    for item in payload.items:
        merged[item.product_id] = merged.get(item.product_id, 0) + item.quantity
    return merged


def create_order(
    db: Session,
    payload: OrderCreate,
    settings: Settings,
    *,
    idempotency_key: str | None = None,
) -> tuple[Order, bool]:
    """Create an order. Returns (order, created). `created` is False when an
    identical idempotency key was replayed and the original order is returned.
    """
    if idempotency_key:
        existing = get_order_by_idempotency_key(db, idempotency_key)
        if existing is not None:
            if existing.customer_phone != payload.customer.phone:
                raise OrderValidationError("Idempotency key already used for a different order.", status_code=409)
            return existing, False

    validate_pickup(payload.pickup_date, payload.pickup_time, settings)

    quantities = _merge_items(payload)
    if len(quantities) > settings.max_items_per_order:
        raise OrderValidationError(
            f"An order can contain at most {settings.max_items_per_order} different products.", field="items"
        )

    products = {p.id: p for p in db.scalars(select(Product).where(Product.id.in_(quantities))).all()}
    missing = sorted(set(quantities) - set(products))
    if missing:
        raise OrderValidationError(f"Product(s) not found: {', '.join(map(str, missing))}.", field="items")

    for product_id, qty in quantities.items():
        product = products[product_id]
        if not product.is_available:
            raise OrderValidationError(f"{product.name} is currently unavailable.", status_code=409, field="items")
        if qty > settings.max_quantity_per_item:
            raise OrderValidationError(
                f"Maximum of {settings.max_quantity_per_item} per product. Please contact the bakery for bulk orders.",
                field="items",
            )

    # Authoritative pricing: always from the database, never from the client.
    subtotal = Decimal("0.00")
    order = Order(
        reference=generate_reference(),
        idempotency_key=idempotency_key,
        customer_name=payload.customer.full_name,
        customer_phone=payload.customer.phone,
        customer_email=str(payload.customer.email) if payload.customer.email else None,
        pickup_date=payload.pickup_date,
        pickup_time=payload.pickup_time.replace(tzinfo=None, second=0, microsecond=0),
        notes=payload.notes,
        status=OrderStatus.PENDING,
        subtotal=Decimal("0.00"),
        total=Decimal("0.00"),
    )
    for product_id, qty in quantities.items():
        product = products[product_id]
        unit_price = Decimal(product.price).quantize(CENT, rounding=ROUND_HALF_UP)
        line = (unit_price * qty).quantize(CENT, rounding=ROUND_HALF_UP)
        subtotal += line
        order.items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                quantity=qty,
                unit_price=unit_price,
                line_subtotal=line,
            )
        )
    order.subtotal = subtotal
    # No delivery fees, taxes or discounts are configured; total == subtotal.
    order.total = subtotal

    try:
        # Single transaction: stock decrement + order + items commit together.
        if settings.inventory_tracking:
            for product_id, qty in quantities.items():
                result = db.execute(
                    update(Product)
                    .where(
                        Product.id == product_id,
                        Product.stock_quantity.is_not(None),
                        Product.stock_quantity >= qty,
                    )
                    .values(stock_quantity=Product.stock_quantity - qty)
                )
                tracked = products[product_id].stock_quantity is not None
                if tracked and result.rowcount != 1:
                    raise OrderValidationError(
                        f"Not enough {products[product_id].name} in stock for this quantity.",
                        status_code=409,
                        field="items",
                    )
        db.add(order)
        db.commit()
    except OrderValidationError:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        # Concurrent replay of the same idempotency key.
        if idempotency_key:
            existing = get_order_by_idempotency_key(db, idempotency_key)
            if existing is not None:
                return existing, False
        raise

    db.refresh(order)
    logger.info("Created order %s with %d line(s), total %s", order.reference, len(order.items), order.total)
    return order, True


def get_order_by_idempotency_key(db: Session, key: str) -> Order | None:
    return db.scalar(select(Order).options(selectinload(Order.items)).where(Order.idempotency_key == key))


def get_order_for_customer(db: Session, reference: str, phone: str) -> Order | None:
    """Scoped lookup: both the unguessable reference AND the contact number must match."""
    order = db.scalar(
        select(Order).options(selectinload(Order.items)).where(Order.reference == reference.strip().upper())
    )
    if order is None or not secrets.compare_digest(order.customer_phone, phone):
        return None
    return order


def set_order_status(db: Session, reference: str, status: OrderStatus) -> Order | None:
    order = db.scalar(select(Order).where(Order.reference == reference.strip().upper()))
    if order is None:
        return None
    order.status = status
    db.commit()
    db.refresh(order)
    return order


def order_to_schema(order: Order, settings: Settings) -> OrderOut:
    return OrderOut(
        reference=order.reference,
        status=order.status,
        status_label=STATUS_LABELS[order.status],
        customer_name=order.customer_name,
        customer_phone_masked=mask_phone(order.customer_phone),
        pickup_date=order.pickup_date,
        pickup_time=order.pickup_time,
        notes=order.notes,
        items=[OrderItemOut.model_validate(i) for i in order.items],
        subtotal=order.subtotal,
        total=order.total,
        currency=settings.currency,
        created_at=order.created_at,
        updated_at=order.updated_at,
        message=STATUS_MESSAGES[order.status],
    )
