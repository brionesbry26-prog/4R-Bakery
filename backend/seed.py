"""Sample catalog seeding.

These are SAMPLE entries with placeholder prices, not verified bakery
inventory. Edit SAMPLE_PRODUCTS (or the database directly) to match the
real menu. Seeding is idempotent: products are matched by `slug`, and
existing rows are never overwritten.
"""

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Product

SAMPLE_PRODUCTS: list[dict] = [
    {
        "slug": "pandesal",
        "name": "Pandesal",
        "description": "Soft, lightly sweet bread rolls dusted with breadcrumbs. A classic Filipino breakfast "
        "favorite, best enjoyed warm with coffee.",
        "price": Decimal("3.00"),
        "unit": "piece",
        "category": "Breads",
        "is_featured": True,
    },
    {
        "slug": "spanish-bread",
        "name": "Spanish Bread",
        "description": "Rolled bread with a buttery, sugary filling and a crumb coating.",
        "price": Decimal("8.00"),
        "unit": "piece",
        "category": "Breads",
        "is_featured": True,
    },
    {
        "slug": "cheese-bread",
        "name": "Cheese Bread",
        "description": "Pillowy bread topped with sugar and filled with sweet cheese.",
        "price": Decimal("10.00"),
        "unit": "piece",
        "category": "Breads",
    },
    {
        "slug": "loaf-bread",
        "name": "Loaf Bread",
        "description": "Soft sliced white loaf for sandwiches and toast.",
        "price": Decimal("65.00"),
        "unit": "loaf",
        "category": "Breads",
    },
    {
        "slug": "ensaymada",
        "name": "Ensaymada",
        "description": "Coiled brioche-style pastry topped with butter, sugar, and grated cheese.",
        "price": Decimal("25.00"),
        "unit": "piece",
        "category": "Pastries",
        "is_featured": True,
    },
    {
        "slug": "cinnamon-rolls",
        "name": "Cinnamon Rolls",
        "description": "Swirled rolls with cinnamon sugar and a light vanilla glaze.",
        "price": Decimal("35.00"),
        "unit": "piece",
        "category": "Pastries",
        "is_featured": True,
    },
    {
        "slug": "birthday-cake",
        "name": "Birthday Cake",
        "description": "Round celebration cake with a personalized greeting. Pre-order at least one day ahead; "
        "flavor and design details can be added in the order notes.",
        "price": Decimal("650.00"),
        "unit": "8-inch cake",
        "category": "Cakes",
        "is_featured": True,
    },
    {
        "slug": "special-occasion-cake",
        "name": "Special Occasion Cake",
        "description": "Custom cakes for weddings, christenings, and fiestas. Final price depends on size and "
        "design; the bakery will confirm details after reviewing your request.",
        "price": Decimal("1200.00"),
        "unit": "starting price",
        "category": "Cakes",
        # Shown as unavailable so the UI's disabled state is exercised out of the box.
        "is_available": False,
    },
]


def seed_products(db: Session) -> int:
    existing = set(db.scalars(select(Product.slug)).all())
    created = 0
    for data in SAMPLE_PRODUCTS:
        if data["slug"] in existing:
            continue
        db.add(Product(**{"is_available": True, "is_featured": False, **data}))
        created += 1
    if created:
        db.commit()
    return created
