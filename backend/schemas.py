"""Pydantic request/response schemas.

Money is serialized as a string with two decimal places (e.g. "12.50") so
clients never receive binary floating-point values for prices.
"""

import re
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    PlainSerializer,
    field_validator,
)

from models import OrderStatus

Money = Annotated[
    Decimal,
    PlainSerializer(lambda v: f"{Decimal(v).quantize(Decimal('0.01'))}", return_type=str, when_used="always"),
]


def _as_utc(value: datetime) -> datetime:
    # SQLite drops tzinfo; values are always stored as UTC.
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


UtcDatetime = Annotated[datetime, PlainSerializer(lambda v: _as_utc(v).isoformat(), return_type=str)]

PH_MOBILE_RE = re.compile(r"^(?:\+?63|0)(9\d{9})$")
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def normalize_ph_phone(raw: str) -> str:
    """Return a Philippine mobile number in E.164 form (+639XXXXXXXXX).

    Accepts 09XXXXXXXXX, 639XXXXXXXXX and +639XXXXXXXXX, ignoring spaces,
    dashes, dots and parentheses.
    """
    cleaned = re.sub(r"[\s\-().]", "", raw or "")
    match = PH_MOBILE_RE.match(cleaned)
    if not match:
        raise ValueError("Enter a valid Philippine mobile number, e.g. 0917 123 4567.")
    return f"+63{match.group(1)}"


def mask_phone(phone: str) -> str:
    return f"{phone[:4]}*****{phone[-3:]}" if len(phone) >= 8 else "***"


# --------------------------------------------------------------------------
# Bakery information
# --------------------------------------------------------------------------


class SocialLinks(BaseModel):
    facebook: str | None = None
    instagram: str | None = None


class PickupRules(BaseModel):
    timezone: str
    min_lead_minutes: int
    max_advance_days: int
    open_time: str | None = Field(None, description="Earliest pickup time (HH:MM), if configured")
    close_time: str | None = Field(None, description="Latest pickup time (HH:MM), if configured")
    max_items_per_order: int
    max_quantity_per_item: int


class BakeryInfo(BaseModel):
    name: str
    description: str
    address: str
    operating_hours: str | None = Field(None, description="Null until the bakery configures its hours")
    phone: str | None = None
    email: str | None = None
    social_links: SocialLinks
    map_url: str
    currency: str
    inventory_tracking: bool
    pickup: PickupRules


# --------------------------------------------------------------------------
# Products
# --------------------------------------------------------------------------


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    price: Money
    unit: str
    category: str
    image_url: str | None
    is_available: bool
    is_featured: bool
    stock_quantity: int | None = Field(None, description="Only reported when inventory tracking is enabled")


class ProductList(BaseModel):
    items: list[ProductOut]
    total: int
    limit: int
    offset: int
    categories: list[str]


SortBy = Literal["name", "-name", "price", "-price", "featured"]


# --------------------------------------------------------------------------
# Orders
# --------------------------------------------------------------------------


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    value = _CONTROL_CHARS_RE.sub("", value).strip()
    return value or None


class CustomerIn(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., min_length=10, max_length=20)
    email: EmailStr | None = Field(None, max_length=254)

    @field_validator("full_name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = _clean_text(v) or ""
        v = re.sub(r"\s+", " ", v)
        if len(v) < 2:
            raise ValueError("Full name is required.")
        if not re.search(r"[A-Za-zÀ-ÿñÑ]", v):
            raise ValueError("Full name must contain letters.")
        return v

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_ph_phone(v)

    @field_validator("email", mode="before")
    @classmethod
    def _blank_email(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v.strip() if isinstance(v, str) else v


class OrderItemIn(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0, le=10_000)


class OrderCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    customer: CustomerIn
    items: list[OrderItemIn] = Field(..., min_length=1, max_length=100)
    pickup_date: date
    pickup_time: time
    notes: str | None = Field(None, max_length=500)

    @field_validator("notes")
    @classmethod
    def _notes(cls, v: str | None) -> str | None:
        return _clean_text(v)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int
    product_name: str
    quantity: int
    unit_price: Money
    line_subtotal: Money


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    reference: str
    status: OrderStatus
    status_label: str
    customer_name: str
    customer_phone_masked: str
    pickup_date: date
    pickup_time: Annotated[time, PlainSerializer(lambda v: v.strftime("%H:%M"), return_type=str)]
    notes: str | None
    items: list[OrderItemOut]
    subtotal: Money
    total: Money
    currency: str
    created_at: UtcDatetime
    updated_at: UtcDatetime
    message: str


STATUS_LABELS: dict[OrderStatus, str] = {
    OrderStatus.PENDING: "Pending",
    OrderStatus.ACCEPTED: "Accepted",
    OrderStatus.PREPARING: "Preparing",
    OrderStatus.READY_FOR_PICKUP: "Ready for Pickup",
    OrderStatus.COMPLETED: "Completed",
    OrderStatus.REJECTED: "Rejected",
    OrderStatus.CANCELLED: "Cancelled",
}

STATUS_MESSAGES: dict[OrderStatus, str] = {
    OrderStatus.PENDING: "Your pre-order request was received and is pending bakery confirmation. "
    "It is not yet confirmed or paid.",
    OrderStatus.ACCEPTED: "The bakery accepted your pre-order.",
    OrderStatus.PREPARING: "The bakery is preparing your order.",
    OrderStatus.READY_FOR_PICKUP: "Your order is ready for pickup.",
    OrderStatus.COMPLETED: "This order has been picked up. Salamat!",
    OrderStatus.REJECTED: "The bakery could not accept this pre-order.",
    OrderStatus.CANCELLED: "This order was cancelled.",
}


class HealthOut(BaseModel):
    status: str
    service: str
    version: str


class ReadinessOut(BaseModel):
    status: str
    database: str


class ErrorOut(BaseModel):
    detail: str | list | dict
