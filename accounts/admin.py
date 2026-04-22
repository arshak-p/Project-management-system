from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from accounts.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = (
        "email",
        "username",
        "first_name",
        "last_name",
        "role",
        "is_staff",
    )
    list_filter = ("role", "is_staff", "is_superuser")
    search_fields = ("email", "username", "first_name", "last_name")

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "Colour Parrot",
            {
                "fields": (
                    "role",
                    "title",
                    "phone",
                    "avatar",
                )
            },
        ),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (
            "Colour Parrot",
            {
                "fields": (
                    "email",
                    "role",
                )
            },
        ),
    )
