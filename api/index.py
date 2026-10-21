"""Vercel serverless entry point for the 4R Bakery API.

Vercel serves the website (web/) as static files and routes /api/*, /docs
and /openapi.json to this function (see vercel.json). The FastAPI app lives
in backend/; this file only makes it importable and prepares the database.
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from main import app, prepare_database  # noqa: E402

# Serverless runtimes may not run ASGI lifespan events, so prepare here.
# Idempotent: creates missing tables and seeds sample products once.
prepare_database()

__all__ = ["app"]
