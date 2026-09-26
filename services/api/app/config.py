from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    environment: str = "development"
    database_url: str = "sqlite:///./thread.db"
    redis_url: str | None = None
    # Comma-separated list of allowed browser origins.
    cors_origins: str = "http://localhost:3000"
    cookie_domain: str | None = None
    cookie_secure: bool = False
    session_days: int = 30
    catalog_path: str = str(ROOT / "packages" / "catalog" / "catalog.json")
    public_web_url: str = "http://localhost:3000"

    # Payments. Without a secret key the API runs checkout in clearly-labelled test mode.
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None

    # OAuth (Google). Disabled unless both are set.
    google_client_id: str | None = None
    google_client_secret: str | None = None

    admin_email: str = "admin@example.com"
    admin_password: str = "thread-admin-2026"
    seed_demo_history: bool = True

    reservation_minutes: int = 15
    rate_limit_per_minute: int = 120
    auth_rate_limit_per_minute: int = 10

    free_shipping_threshold_cents: int = 10_000
    flat_shipping_cents: int = 800
    express_shipping_cents: int = 2_000
    tax_rate: float = 0.0  # Prices are tax-inclusive for the fictional brand.

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
