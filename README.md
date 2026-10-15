# 4R Bakery: Website + API

The customer website for **4R Bakery** (Brgy. Bachawan, San Agustin, Romblon, Philippines), backed by a Python REST API. Customers browse the menu, fill a bag and submit **pre-order requests**. Each request stays *pending* until the bakery confirms it, and customers can track its status.

The design uses a clean warm-neutral palette and editorial food photography (see **Photos** below).

## Run it (one command)

The FastAPI backend also serves the website, so there's **no Node.js or build step**.

**Windows (PowerShell):**
```powershell
cd backend
py -V:3.12 -m venv .venv            # or: py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**macOS / Linux:**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Then open:
- **Website:** http://localhost:8000/
- **API docs:** http://localhost:8000/docs

To see the site from a phone on the same Wi-Fi, use `http://<your-computer-IP>:8000/`. Find your IP with `ipconfig` (Windows) or `ifconfig` (macOS/Linux), and allow port 8000 through the firewall.

> **Windows tip:** If `pip` breaks with `ImportError ... BuildDependencyInstallError`, the virtual environment is corrupted. Run `deactivate`, then `Remove-Item -Recurse -Force .venv`, and repeat the steps. Python 3.12 is the tested version.

## Project structure

```text
4R-Bakery/
├── web/                     Customer website (HTML + CSS + JS modules, no build step)
│   ├── index.html
│   ├── css/styles.css       Design tokens + all components (responsive)
│   ├── js/
│   │   ├── app.js           Shell (header, bag drawer, footer), routing, global actions
│   │   ├── api.js           API client (timeouts, typed errors)
│   │   ├── store.js         Catalog, bag (localStorage), remembered orders
│   │   ├── illustrations.js Inline SVG bakery artwork (used when no photo exists)
│   │   ├── icons.js, ui.js, format.js, validation.js, router.js, config.js
│   │   └── views/           home, menu, product, checkout, orders (confirmation + track), visit
│   └── e2e/website.e2e.js   Playwright end-to-end test
├── backend/                 FastAPI + SQLAlchemy + SQLite (PostgreSQL-ready); serves web/ at "/"
│   ├── main.py, config.py, database.py, models.py, schemas.py, crud.py, seed.py, manage.py
│   ├── tests/test_api.py    49 pytest tests
│   └── README.md            API reference, configuration, security notes
└── mobile/                  Optional Expo (React Native) app using the same API
```

**Hosting the website elsewhere** (for example Netlify, or any static host): upload `web/`, set `SERVE_WEBSITE=false` in the backend `.env`, add the site's origin to `CORS_ORIGINS`, and point the site at your API by adding this before `app.js` in `index.html`:
`<script>window.BAKERY_CONFIG = { apiBaseUrl: "https://api.your-domain/api" }</script>`.

## Website features

**Home.** A split hero with a layered illustration that responds to scrolling (parallax) and pointer movement, gently floating unless the visitor has turned on "Reduce motion". Below that: a scrolling product strip, featured bestsellers loaded from the API, "how pre-ordering works", the bakery's story, and a call-to-action for celebration cakes.

**Menu.** A sidebar with search, category filters (with counts) and sorting by featured, name or price. Filtering happens in the browser on the catalog loaded from the API. Unavailable items are marked and can't be added. Loading skeletons, an empty "no matches" state and an error state with retry are all handled.

**Product page.** Large artwork, price per unit, availability, a quantity stepper with a live line total, "already in your bag", and related items. Price and availability are re-fetched from the API every time the page opens.

**Bag.** A slide-in drawer reachable from every page (Esc closes it). It has +/– controls and remove, an estimated subtotal, and is saved in the browser. Items that became unavailable block checkout.

**Pre-order checkout.** Two numbered form sections with a sticky order summary, inline validation, PH mobile number checks, date/time inputs limited to the bakery's rules, and a notes counter. On submit, the site:
1. Re-checks the menu with the server and stops if any price or availability changed.
2. Sends the order with an `Idempotency-Key`. The button locks while sending, so double clicks or retries never create a duplicate.
3. Clears the bag **only after** the server confirms the order.

Server field errors are mapped back onto the form fields. If the connection drops, the site says "Your request was not sent" and keeps the bag.

**Confirmation and tracking.** Shows the real server reference, `Pending` status, the server-computed total and a copy button. The Track page refreshes orders placed in this browser and can look up any order by reference + mobile number.

**Visit us.** Address with directions and copy, opening hours, phone, email and social links, plus an embedded map. Details show "not yet published" until the bakery sets them in `backend/.env`.

**Responsive.** Desktop-first layout (1200px container). Below 900px the menu sidebar becomes chips and navigation moves into a menu button. Single-column layout below 600px.

**Accessibility.** Semantic landmarks, a skip link, visible focus rings, labelled icon buttons, live regions for errors and toasts, an `inert` drawer when closed, and 44px+ targets.

### Design system

All colors are CSS variables at the top of `web/css/styles.css`:

| Role | Color | Used for |
|---|---|---|
| Background | `#FAF7F2` (warm off-white) | Page background |
| Surface | `#FFFFFF` | Cards, header, drawer |
| Ink | `#221B15` | Text |
| Espresso | `#2B2118` | Buttons, brand mark |
| Caramel | `#A8552A` | Small highlights: eyebrows, links, the headline accent |
| Sand | `#EFE4D6` / `#F3EDE5` | Quiet panels |
| Border | `#E8E0D5` | Hairlines |

Typography is Montserrat with system-font fallbacks.

The colors are checked for readability: body text is 15.9:1 contrast against the background, muted text 5.5:1, and the caramel links 4.9:1, all above the WCAG AA minimum.

### Photos

- The product and section photos are **AI-generated stand-ins** (Higgsfield, `z_image` model). They are realistic, but they are **not** photos of 4R Bakery's actual products or shop.
- Each photo loads in this order: a local copy in `web/images/`, then the hosted copy, then a drawn illustration if both fail.
- To save the photos locally, run `.\web\images\download-photos.ps1` on Windows or `sh web/images/download-photos.sh` on macOS/Linux.
- To use the bakery's real photos, replace the files in `web/images/` using the same names. See `web/images/README.md`.

### Optional mobile app (`mobile/`)

The earlier Expo/React Native app still works against the same API (`cd mobile && npm install && npx expo start`). Its screenshots are in `docs/screenshots/mobile-app/`. It isn't needed for the website.

## Testing

### Executed in this environment

| Suite | Command | Result |
|---|---|---|
| Backend unit/integration | `cd backend && pytest -q` | **49 passed** (includes the website being served at `/` while `/api` routes still take priority) |
| Website end-to-end, desktop 1440px | `NODE_PATH=$(npm root -g) node web/e2e/website.e2e.js` | **17/17 checks passed** |
| Website end-to-end, phone 390px | `VIEWPORT=mobile … node web/e2e/website.e2e.js` | **17/17 checks passed** |
| Optional mobile app (Jest, bundles) | `cd mobile && npm test` | 19 passed (from the earlier mobile build) |

The end-to-end run uses the real backend and covers:
- all 8 products loading from the API,
- search, category filter and price sort,
- an unavailable item being blocked,
- the product page line total (5 × ₱3.00 = ₱15.00),
- bag drawer quantity changes,
- validation errors on an empty form,
- **a simulated network failure keeping the bag**,
- a successful submit showing a real `4R-XXXX-XXXX` reference, `Pending` status and the server total ₱18.00,
- the bag clearing only after success,
- the order showing on Track,
- the API-down retry state and recovery,
- no JavaScript errors.

To run it: start the backend, install Playwright once (`npm i -g playwright && npx playwright install chromium`), then run the command above. Screenshots go to `web/e2e/screenshots/`.

### Not yet verified

- Real-device browsers: iPhone Safari, Android Chrome, and older Windows browsers.
- Screen-reader walkthroughs (NVDA, VoiceOver).
- The embedded Google map: the test sandbox blocks Google, so it showed as an empty frame there. It loads normally on a regular internet connection.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Python was not found` (Windows) | Install Python 3.12 (`winget install -e --id Python.Python.3.12`), then open a new PowerShell window |
| `ImportError … BuildDependencyInstallError` | The venv is corrupted. Run `deactivate`, then `Remove-Item -Recurse -Force .venv`, and recreate it with `py -V:3.12 -m venv .venv` |
| "Running scripts is disabled" | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once |
| Site says "We can't reach the bakery" | Make sure `uvicorn` is running and you opened the site from the same server (http://localhost:8000/) |
| Phone can't open the site | Use your PC's LAN IP, start uvicorn with `--host 0.0.0.0`, use the same Wi-Fi, and allow port 8000 in the firewall |
| "Pickup must be in the future" near midnight | Pickup times use bakery time (Asia/Manila) |
| `429 Too many requests` | Raise `ORDER_RATE_LIMIT_PER_MINUTE` in development, or set it to `0` |

## Before deployment: what still needs configuring

1. **Real business details** in `backend/.env`: phone, hours, email, social links and an exact map URL. These were left blank on purpose rather than invented.
2. **The real menu and prices.** The seeded products and prices are samples. Product photos are optional.
3. **Pickup rules:** lead time, advance days, and optionally the pickup window.
4. **Hosting:** HTTPS, PostgreSQL, proxy-level rate limiting, and `ENVIRONMENT=production` with an explicit `CORS_ORIGINS`.
5. **Logo:** the "4R" mark is a placeholder. Swap in the bakery's real logo if it has one.

## Out of scope for this release (designed to be added later)

The following were deliberately **not** built:
- payments,
- delivery,
- customer accounts,
- an authenticated staff/admin interface (status changes currently use `manage.py`),
- push notifications,
- real-time stock.

The `OrderStatus` enum, the idempotent order API, per-item price snapshots and optional inventory tracking are in place so these can be added without rewriting the app.
