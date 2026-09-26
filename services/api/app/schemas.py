from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .models import OrderStatus, Role


class Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- Auth ----
class RegisterIn(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=10, max_length=200)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Please enter your name.")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class UserOut(Out):
    id: int
    email: str
    name: str
    role: Role


# ---- Catalog / inventory ----
class InventoryOut(BaseModel):
    sku: str
    available: int


# ---- Addresses ----
class AddressIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    line1: str = Field(min_length=1, max_length=200)
    line2: str | None = Field(default=None, max_length=200)
    city: str = Field(min_length=1, max_length=100)
    region: str = Field(min_length=1, max_length=100)
    postal_code: str = Field(min_length=2, max_length=20)
    country: str = Field(min_length=2, max_length=2, pattern="^[A-Z]{2}$")


class AddressOut(Out, AddressIn):
    id: int
    is_default: bool


# ---- Checkout / orders ----
class CheckoutItem(BaseModel):
    sku: str = Field(max_length=40)
    quantity: int = Field(ge=1, le=10)


class CheckoutIn(BaseModel):
    email: EmailStr
    items: list[CheckoutItem] = Field(min_length=1, max_length=30)
    shipping_address: AddressIn
    shipping_method: Literal["standard", "express"] = "standard"
    save_address: bool = False


class QuoteIn(BaseModel):
    items: list[CheckoutItem] = Field(min_length=1, max_length=30)
    shipping_method: Literal["standard", "express"] = "standard"


class QuoteLine(BaseModel):
    sku: str
    quantity: int
    unit_price_cents: int
    available: int


class QuoteOut(BaseModel):
    lines: list[QuoteLine]
    subtotal_cents: int
    shipping_cents: int
    tax_cents: int
    total_cents: int


class OrderItemOut(Out):
    sku: str
    product_slug: str
    product_name: str
    color: str
    size: str
    unit_price_cents: int
    quantity: int
    batch: str


class OrderEventOut(Out):
    status: OrderStatus
    note: str | None
    location: str | None
    created_at: datetime


class OrderOut(Out):
    id: int
    number: str
    status: OrderStatus
    email: str
    subtotal_cents: int
    shipping_cents: int
    tax_cents: int
    total_cents: int
    shipping_method: str
    shipping_address: dict
    payment_mode: str
    items: list[OrderItemOut]
    events: list[OrderEventOut]
    created_at: datetime


class CheckoutOut(BaseModel):
    order: OrderOut
    access_token: str
    payment_mode: Literal["stripe", "test"]
    client_secret: str | None = None
    reserved_until: datetime


class TestPaymentIn(BaseModel):
    access_token: str
    card_number: str = Field(min_length=12, max_length=23)


class AdvanceIn(BaseModel):
    status: OrderStatus
    note: str | None = Field(default=None, max_length=500)


# ---- Account ----
class MeasurementsIO(Out):
    height_cm: int | None = Field(default=None, ge=100, le=230)
    weight_kg: int | None = Field(default=None, ge=30, le=250)
    chest_cm: int | None = Field(default=None, ge=50, le=180)
    waist_cm: int | None = Field(default=None, ge=40, le=180)
    preferred_fit: Literal["fitted", "regular", "relaxed"] = "regular"


class PreferencesIO(Out):
    newsletter: bool = False
    order_updates: bool = True
    units: Literal["metric", "imperial"] = "metric"


class WishlistOut(Out):
    product_slug: str
    created_at: datetime


class VariantStockIn(BaseModel):
    on_hand: int = Field(ge=0, le=100_000)
