"""
Load reference data: departments, clients (projects), workflow states, modules, labels,
and a demo admin user (override with env SEED_ADMIN_PASSWORD).
"""
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from tms.models import (
    Department,
    Label,
    Module,
    Project,
    ProjectTaskSequence,
    State,
    UserProfile,
)

User = get_user_model()

DEPARTMENTS = [
    ("Digital Marketing", "digital_marketing"),
    ("Content Creation", "content_creation"),
    ("Video Production", "video_production"),
    ("Graphics Design", "graphics_design"),
    ("AI & Motion", "ai_motion"),
    ("Web Design", "web_design"),
]

# Department heads (Web Design team has no named head in seed — add via admin).
DEPT_HEADS = [
    ("digital_marketing", "sinan@colourparrot.local", "Sinan"),
    ("content_creation", "arshida@colourparrot.local", "Arshida"),
    ("video_production", "khair@colourparrot.local", "Khair"),
    ("graphics_design", "shabeel@colourparrot.local", "Shabeel"),
    ("ai_motion", "niyas@colourparrot.local", "Niyas"),
]

CLIENTS = [
    "Railrolls",
    "Capitus",
    "Edwin",
    "Kalqy",
    "Airova",
    "Zeyka",
    "Frywings",
]

MODULES = [
    ("Branding", "branding", 1),
    ("Social Media", "social_media", 2),
    ("Performance Marketing", "performance_marketing", 3),
    ("Content", "content", 4),
    ("Campaign Strategy", "campaign_strategy", 5),
    ("Video Production", "video_production", 6),
    ("Web Design", "web_design", 7),
    ("AI & Motion", "ai_motion", 8),
]

STATES = [
    ("Backlog", "backlog", 1),
    ("Strategy Planning", "strategy_planning", 2),
    ("In Progress", "in_progress", 3),
    ("Creative Review", "creative_review", 4),
    ("Client Review", "client_review", 5),
    ("Approved", "approved", 6),
    ("Launched / Completed", "launched_completed", 7),
]

LABELS = [
    ("urgent", "Urgent", "red"),
    ("revision", "Revision", "amber"),
    ("high_value_client", "High-Value Client", "violet"),
    ("approved", "Approved", "emerald"),
    ("awaiting_feedback", "Awaiting Feedback", "sky"),
    ("on_hold", "On Hold", "zinc"),
]


class Command(BaseCommand):
    help = "Seed Colour Parrot departments, projects, workflow catalogue, labels, and demo users."

    @transaction.atomic
    def handle(self, *args, **options):
        for name, slug in DEPARTMENTS:
            Department.objects.get_or_create(slug=slug, defaults={"name": name})

        for title, slug, order in MODULES:
            Module.objects.get_or_create(slug=slug, defaults={"name": title, "sort_order": order})

        for title, slug, order in STATES:
            State.objects.get_or_create(slug=slug, defaults={"name": title, "sort_order": order})

        for key, name, color in LABELS:
            Label.objects.get_or_create(key=key, defaults={"name": name, "color_hint": color})

        for client in CLIENTS:
            slug = client.lower().replace(" ", "-")
            p, _created = Project.objects.get_or_create(
                slug=slug, defaults={"name": client, "description": f"{client} — client project"}
            )
            ProjectTaskSequence.objects.get_or_create(project=p, defaults={"last_number": 0})

        # Leadership & roles (password from env or default for first bootstrap only).
        pwd = os.environ.get("SEED_ADMIN_PASSWORD", "ChangeMeNow!")

        def ensure_user(email, first, last, role, dept_slug=None, client_slug=None):
            u, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": email.split("@")[0],
                    "first_name": first,
                    "last_name": last,
                    "role": role,
                },
            )
            if created:
                u.set_password(pwd)
                u.save()
            if role == User.Role.ADMIN:
                u.is_staff = True
                if email.startswith("sneha"):
                    u.is_superuser = True
                u.save(update_fields=["is_staff", "is_superuser"])
            prof, _ = UserProfile.objects.get_or_create(user=u)
            if dept_slug:
                d = Department.objects.filter(slug=dept_slug).first()
                if d:
                    prof.department = d
            if client_slug:
                cp = Project.objects.filter(slug=client_slug).first()
                if cp:
                    prof.client_project = cp
            prof.save()
            return u

        ensure_user("sneha@colourparrot.local", "Sneha", "PM", User.Role.ADMIN)
        ensure_user("coordinator@colourparrot.local", "Project", "Coordinator", User.Role.ADMIN)
        ensure_user("sales@colourparrot.local", "Sales", "Manager", User.Role.SALES_MANAGER)

        for dept_slug, email, first in DEPT_HEADS:
            ensure_user(email, first, "Head", User.Role.TEAM_HEAD, dept_slug)

        ensure_user(
            "client-railrolls@example.com",
            "Railrolls",
            "Client",
            User.Role.CLIENT,
            client_slug="railrolls",
        )

        # Link department heads on Department.head (best-effort after users exist).
        for dept_slug, email, _first in DEPT_HEADS:
            dept = Department.objects.filter(slug=dept_slug).first()
            head = User.objects.filter(email=email).first()
            if dept and head:
                dept.head = head
                dept.save(update_fields=["head"])

        self.stdout.write(self.style.SUCCESS("Colour Parrot seed data applied."))
        self.stdout.write(
            "Demo login (change password in production): sneha@colourparrot.local / "
            + ("(SEED_ADMIN_PASSWORD)" if os.environ.get("SEED_ADMIN_PASSWORD") else pwd)
        )
