"""Application configuration loaded from environment variables / `.env`.

Business details (phone, hours, social links) are intentionally empty by
default. They must be supplied by the bakery rather than invented.
"""

from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Runtime -----------------------------------------------------------
    environment: str = Field("development", description="development | production")
    database_url: str = "sqlite:///./bakery.db"
    # Comma-separated list of allowed CORS origins. "*" is only honoured in development.
    cors_origins: str = "*"
    log_level: str = "INFO"
    seed_sample_products: bool = True
    # Serve the customer website (../web) at "/". Disable when hosting it elsewhere.
    serve_website: bool = True

    # --- Business information (leave blank until verified) ----------------
    bakery_name: str = "4R Bakery"
    bakery_description: str = (
        "A neighborhood bakery in Bachawan serving freshly baked bread, pastries, "
        "and cakes for everyday merienda and special occasions."
    )
    bakery_address: str = "Brgy. Bachawan, San Agustin, Romblon, Philippines"
    bakery_phone: str = ""
    bakery_email: str = ""
    # Free text, e.g. "Mon-Sat 5:00 AM - 7:00 PM; Sun 6:00 AM - 12:00 NN"
    bakery_hours: str = ""
    bakery_facebook_url: str = ""
    bakery_instagram_url: str = ""
    bakery_map_url: str = ""
    bakery_timezone: str = "Asia/Manila"

    # --- Ordering rules ----------------------------------------------------
    currency: str = "PHP"
    # When true, stock_quantity is enforced and decremented on order creation.
    inventory_tracking: bool = False
    min_pickup_lead_minutes: int = Field(60, ge=0)
    max_pickup_advance_days: int = Field(60, ge=1)
    # Optional daily pickup window "HH:MM". Leave blank to accept any time of day.
    pickup_open_time: str = ""
    pickup_close_time: str = ""
    max_items_per_order: int = Field(30, ge=1)
    max_quantity_per_item: int = Field(500, ge=1)

    # --- Abuse protection --------------------------------------------------
    max_request_body_bytes: int = 32_768
    order_rate_limit_per_minute: int = Field(10, ge=0, description="0 disables the limiter")
    lookup_rate_limit_per_minute: int = Field(60, ge=0, description="0 disables the limiter")

    @field_validator("pickup_open_time", "pickup_close_time")
    @classmethod
    def _validate_hhmm(cls, value: str) -> str:
        value = value.strip()
        if value:
            hours, _, minutes = value.partition(":")
            if not (hours.isdigit() and minutes.isdigit() and 0 <= int(hours) < 24 and 0 <= int(minutes) < 60):
                raise ValueError("must be in HH:MM 24-hour format")
        return value

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.bakery_timezone)

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        if self.is_production:
            # Never allow a wildcard in production.
            origins = [o for o in origins if o != "*"]
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
