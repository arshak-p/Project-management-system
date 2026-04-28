"""DRF permission classes aligned with Colour Parrot RBAC."""
from rest_framework import permissions

from accounts.models import User


class BlockSalesWrites(permissions.BasePermission):
    """Sales Manager: GET only."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if getattr(request.user, "role", None) == User.Role.SALES_MANAGER:
            return request.method in permissions.SAFE_METHODS
        return True


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(
            u
            and u.is_authenticated
            and (u.is_superuser or getattr(u, "role", None) in [User.Role.ADMIN])
        )

class IsPMOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(
            u
            and u.is_authenticated
            and (u.is_superuser or getattr(u, "role", None) in [User.Role.ADMIN, User.Role.PROJECT_MANAGER, User.Role.TEAM_HEAD])
        )
