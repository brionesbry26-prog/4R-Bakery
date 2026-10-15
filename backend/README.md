# 4R Bakery API (FastAPI)

REST API for the 4R Bakery customer app: bakery information, product catalog, and pre-order requests.

## Quick start

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt  # runtime deps + pytest/httpx
cp .env.example .env                 # then edit business details
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- Swagger UI: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json
- `--host 0.0.0.0` lets phones and emulators on your network reach the server.

On first startup, tables are created and the **sample** catalog is seeded into `bakery.db` (SQLite). Seeding matches products by `slug`, so restarting never creates duplicates and never overwrites your edits.

## Configuration (`.env`)

Every setting is documented in [`.env.example`](.env.example). The main ones:

| Variable | Default | Purpose |
|---|---|---|
| `ENVIRONMENT` | `development` | In `production`, a `*` in `CORS_ORIGINS` is ignored |
| `DATABASE_URL` | `sqlite:///./bakery.db` | Any SQLAlchemy URL. For PostgreSQL, use `postgresql+psycopg://…` and add `psycopg[binary]` |
| `CORS_ORIGINS` | `*` | Comma-separated. Native apps send no `Origin`; CORS only affects web clients |
| `BAKERY_PHONE`, `BAKERY_EMAIL`, `BAKERY_HOURS`, `BAKERY_FACEBOOK_URL`, `BAKERY_INSTAGRAM_URL`, `BAKERY_MAP_URL` | empty | **Blank until the bakery supplies verified details.** The app then says "not yet configured" and never shows invented values |
| `INVENTORY_TRACKING` | `false` | When `true`, `stock_quantity` is enforced and decremented in the order transaction |
| `MIN_PICKUP_LEAD_MINUTES` / `MAX_PICKUP_ADVANCE_DAYS` | `60` / `60` | Pickup scheduling rules |
| `PICKUP_OPEN_TIME` / `PICKUP_CLOSE_TIME` | empty | Optional daily pickup window (`HH:MM`). Both must be set |
| `MAX_QUANTITY_PER_ITEM` / `MAX_ITEMS_PER_ORDER` | `500` / `30` | Order size limits |
| `ORDER_RATE_LIMIT_PER_MINUTE` / `LOOKUP_RATE_LIMIT_PER_MINUTE` | `10` / `60` | Per-IP limits (`0` disables) |
| `MAX_REQUEST_BODY_BYTES` | `32768` | Larger requests get `413` |

## Endpoints

All under `/api`. Money values are **strings with two decimals** (`"12.50"`) so they never pass through binary floating point.

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness: `{"status":"ok"}` |
| GET | `/health/ready` | Readiness including a DB query (`503` if the DB is down) |
| GET | `/bakery/info` | Name, description, address, hours, phone, email, socials, map URL, pickup rules |
| GET | `/bakery/products` | Query params: `category`, `search`, `sort_by` (`featured`, `name`, `-name`, `price`, `-price`), `limit` (1–100), `offset`. Returns `{items, total, limit, offset, categories}` |
| GET | `/bakery/products/{id}` | One product, or `404` |
| POST | `/bakery/orders` | Create a pre-order (`201`). Optional `Idempotency-Key` header |
| GET | `/bakery/orders/{reference}` | Look up an order. **Requires** the `X-Contact-Phone` header |

### Creating an order

```bash
curl -X POST http://localhost:8000/api/bakery/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: checkout-7f3a9c2e" \
  -d '{
    "customer": {"full_name": "Juan Dela Cruz", "phone": "0917 123 4567", "email": null},
    "items": [{"product_id": 1, "quantity": 10}],
    "pickup_date": "2026-12-20",
    "pickup_time": "10:00",
    "notes": "Please prepare fresh pandesal."
  }'
```

What the server does:

1. Validates every field. The name needs letters, the phone must be a PH mobile number (`09…`, `639…` or `+639…`, normalized to `+639XXXXXXXXX`), the email is optional, and notes are limited to 500 characters with control characters stripped. Unknown fields such as `total` or `price` are **rejected** (`422`).
2. Checks that pickup is in the future, at least `MIN_PICKUP_LEAD_MINUTES` away, within `MAX_PICKUP_ADVANCE_DAYS`, and inside the pickup window if one is configured. Times are in `Asia/Manila`.
3. Merges duplicate product lines and checks that each product exists (`422`) and is available (`409`), and that quantity limits are respected.
4. **Takes prices from the database** and computes line totals with `Decimal`. `total = subtotal`, since no fees, taxes or discounts are configured.
5. Saves the order and its items in one transaction. When inventory tracking is on, stock is decremented with conditional `UPDATE … WHERE stock_quantity >= qty` statements. If any line fails, the whole order rolls back (`409`).
6. Returns the order with a random reference (`4R-XXXX-XXXX`), status `pending`, and a message saying it is pending bakery confirmation.

**Duplicate submissions.** If the same `Idempotency-Key` is sent again, the server returns the original order with `200` instead of creating a second one. The mobile app sends one key per checkout attempt.

### Looking up an order

```bash
curl http://localhost:8000/api/bakery/orders/4R-ABCD-EFGH -H "X-Contact-Phone: 09171234567"
```

There are no customer accounts in this MVP, so lookup is scoped to **reference + contact number**:

- References are 8 random characters from a 31-letter alphabet (~8.5 × 10¹¹ combinations). They are not sequential.
- A wrong phone and an unknown reference return the **same** `404`, so a lookup cannot confirm that an order exists.
- The phone travels in a header, which keeps it out of URLs and access logs. Responses mask it (`+639*****567`).
- No endpoint lists all orders.
- Lookups are rate-limited per IP.

**Limitations:** anyone holding both the reference and the phone number can view the order. The in-process rate limiter is per server process. For multiple instances, rate-limit at the reverse proxy or with Redis.

### Order statuses

`pending`, `accepted`, `preparing`, `ready_for_pickup`, `completed`, `rejected`, `cancelled`.

## Staff commands (no admin UI yet)

```bash
python manage.py list-orders [--status pending]
python manage.py set-status 4R-ABCD-EFGH accepted
python manage.py set-availability 3 false
python manage.py seed
```

## Editing the catalog

`seed.py` holds **sample** products with placeholder prices. They are not verified bakery inventory. To use the real menu, do one of these:

- Edit `SAMPLE_PRODUCTS` before the first run, or
- Edit the `products` table directly (any SQLite tool), or use `manage.py set-availability`.

For product photos, put files in `static/products/` and set `image_url` to `/static/products/<file>.jpg`. Absolute `https://` URLs also work. Products without a photo show an illustrated fallback in the app.

## Tests

```bash
pytest -q
```

The 48 tests cover health and readiness, bakery info, product listing, filters, sorting and pagination, invalid query params, product 404s, order validation (empty orders, bad quantities, bad phone, name and email values, long notes, past or too-far pickups, lead time, pickup window), unknown and unavailable products, server-side pricing and rejection of client totals, merged lines, historical price snapshots, idempotent replays, lookup access control, status changes, persistence across a new engine (simulated restart), inventory rollback and overselling, body-size limit, rate limiter, and that 500 errors don't leak details. Tests use a temporary SQLite database.

## Production checklist

- `ENVIRONMENT=production`, explicit `CORS_ORIGINS`, and a PostgreSQL `DATABASE_URL` (add `psycopg[binary]`). Use Alembic for schema migrations once the schema starts changing. Today it is created with `create_all`.
- Serve behind HTTPS (Caddy, Nginx, or a managed platform) with `uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2` or gunicorn with uvicorn workers. Enforce rate limits at the proxy.
- Set `SEED_SAMPLE_PRODUCTS=false` once the real catalog is loaded.
- Fill in the verified business details in `.env`. Never commit `.env`.
- Before exposing order management to staff over the network, add an authenticated admin API.
