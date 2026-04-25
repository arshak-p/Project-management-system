"""
Seed the essential workflow States and Modules for Colour Parrot.
Run: python manage.py seed_workflow
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from tms.models import State, Module


STATES = [
    {"name": "Pending",                "slug": "pending",              "sort_order": 1},
    {"name": "In Progress",            "slug": "in-progress",          "sort_order": 2},
    {"name": "Team Head Review",       "slug": "team-head-review",     "sort_order": 3},
    {"name": "Client Review",          "slug": "client-review",        "sort_order": 4},
    {"name": "Completed / Launched",   "slug": "completed-launched",   "sort_order": 5},
]

MODULES = [
    {"name": "Design",        "slug": "design",        "sort_order": 1},
    {"name": "Development",   "slug": "development",   "sort_order": 2},
    {"name": "Marketing",     "slug": "marketing",     "sort_order": 3},
    {"name": "Content",       "slug": "content",       "sort_order": 4},
    {"name": "General",       "slug": "general",       "sort_order": 5},
]


def seed():
    print("\n--- Seeding Colour Parrot Workflow ---\n")

    print("-- States --")
    for s in STATES:
        obj, created = State.objects.get_or_create(
            slug=s["slug"],
            defaults={"name": s["name"], "sort_order": s["sort_order"]},
        )
        status = "Created" if created else "Exists"
        print(f"  {status}: {obj.name} (slug: {obj.slug})")

    print("\n-- Modules --")
    for m in MODULES:
        obj, created = Module.objects.get_or_create(
            slug=m["slug"],
            defaults={"name": m["name"], "sort_order": m["sort_order"]},
        )
        status = "Created" if created else "Exists"
        print(f"  {status}: {obj.name} (slug: {obj.slug})")

    print("\nWorkflow seeding complete!\n")


if __name__ == "__main__":
    seed()
