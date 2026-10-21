import os
import sys
import tempfile
from pathlib import Path

import pytest

# Configure an isolated database BEFORE application modules are imported.
_TMP = Path(tempfile.mkdtemp(prefix="bakery-tests-"))
# Set TEST_DATABASE_URL to run the suite against PostgreSQL instead of SQLite.
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{_TMP / 'test.db'}"
os.environ["ORDER_RATE_LIMIT_PER_MINUTE"] = "0"
os.environ["LOOKUP_RATE_LIMIT_PER_MINUTE"] = "0"
os.environ["SEED_SAMPLE_PRODUCTS"] = "true"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from config import get_settings  # noqa: E402
from database import Base, SessionLocal, engine  # noqa: E402
from seed import seed_products  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    with TestClient(main.app) as c:  # lifespan creates tables and seeds
        yield c
    main.app.dependency_overrides.clear()


@pytest.fixture()
def db():
    with SessionLocal() as session:
        yield session


@pytest.fixture()
def settings():
    return get_settings()


@pytest.fixture()
def db_path():
    return _TMP / "test.db"
