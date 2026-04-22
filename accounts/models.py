"""
Custom user with Colour Parrot roles and optional department / client project linkage.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Application roles drive RBAC across the TMS API.
    - admin: full access (Project Manager, Coordinator).
    - team_head: manage work within own department.
    - team_member: assigned tasks only (read/update own).
    - sales_manager: read-only across projects.
    - client: single linked project; approve tasks in client review.
    """

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin / Agency Manager"
        PROJECT_MANAGER = "project_manager", "Project Manager"
        TEAM_HEAD = "team_head", "Team Head"
        SPECIALIST = "specialist", "Specialist / Creator"
        SALES_MANAGER = "sales_manager", "Sales Manager"
        CLIENT = "client", "Client"

    email = models.EmailField("email address", unique=True)
    role = models.CharField(
        max_length=32,
        choices=Role.choices,
        default=Role.SPECIALIST,
        db_index=True,
    )
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    title = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=32, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self) -> str:
        return self.get_full_name() or self.email
