"""Small command-line helper for bakery staff / developers.

There is no admin web UI or authentication in this release. Run these
commands on the server that hosts the database.

    python manage.py init-db
    python manage.py seed
    python manage.py list-orders [--status pending]
    python manage.py set-status 4R-ABCD-EFGH accepted
    python manage.py set-availability 3 false
"""

import argparse
import sys

from sqlalchemy import select

import crud
from database import SessionLocal, init_db
from models import Order, OrderStatus, Product
from seed import seed_products


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="4R Bakery management commands")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("init-db", help="Create database tables")
    sub.add_parser("seed", help="Insert sample products that do not exist yet")
    lo = sub.add_parser("list-orders", help="List recent orders")
    lo.add_argument("--status", choices=[s.value for s in OrderStatus])
    lo.add_argument("--limit", type=int, default=20)
    ss = sub.add_parser("set-status", help="Change an order's status")
    ss.add_argument("reference")
    ss.add_argument("status", choices=[s.value for s in OrderStatus])
    sa = sub.add_parser("set-availability", help="Mark a product available or unavailable")
    sa.add_argument("product_id", type=int)
    sa.add_argument("available", choices=["true", "false"])
    args = parser.parse_args(argv)

    init_db()
    with SessionLocal() as db:
        if args.command == "init-db":
            print("Database ready.")
        elif args.command == "seed":
            print(f"Seeded {seed_products(db)} product(s).")
        elif args.command == "list-orders":
            stmt = select(Order).order_by(Order.created_at.desc()).limit(args.limit)
            if args.status:
                stmt = stmt.where(Order.status == OrderStatus(args.status))
            for o in db.scalars(stmt):
                print(f"{o.reference}  {o.status.value:<16} {o.pickup_date} {o.pickup_time:%H:%M}  "
                      f"PHP {o.total:>9}  {o.customer_name}")
        elif args.command == "set-status":
            order = crud.set_order_status(db, args.reference, OrderStatus(args.status))
            if order is None:
                print("Order not found.", file=sys.stderr)
                return 1
            print(f"{order.reference} -> {order.status.value}")
        elif args.command == "set-availability":
            product = db.get(Product, args.product_id)
            if product is None:
                print("Product not found.", file=sys.stderr)
                return 1
            product.is_available = args.available == "true"
            db.commit()
            print(f"{product.name}: available={product.is_available}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
