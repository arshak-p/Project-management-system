"""DRF permission classes aligned with Colour Parrot RBAC."""
from rest_framework import permissions

from accounts.models import User
from tms import access


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
        return access.is_admin(request.user)


class IsPMOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return access.is_manager(request.user)


class IsAuthorOrManager(permissions.BasePermission):
    """Object-level: only the record's owner (or an admin / PM) may change or delete it."""

    owner_fields = ("author", "user", "uploaded_by")

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if access.is_manager(request.user):
            return True
        for field in self.owner_fields:
            if hasattr(obj, f"{field}_id"):
                return getattr(obj, f"{field}_id") == request.user.id
        return False
