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
        return bool(u and u.is_authenticated and (u.is_superuser or getattr(u, "role", None) == User.Role.ADMIN))

class IsPMOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_superuser or getattr(u, "role", None) in [User.Role.ADMIN, User.Role.PROJECT_MANAGER]))

class IsLeadPMOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_superuser or getattr(u, "role", None) in [User.Role.ADMIN, User.Role.PROJECT_MANAGER, User.Role.TEAM_HEAD]))

class IsAgencyManagerOrHR(permissions.BasePermission):
    """Full management: Create, Update, Delete members."""
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_superuser or getattr(u, "role", None) in [User.Role.ADMIN, User.Role.HR]))

class IsPMReadOrAbove(permissions.BasePermission):
    """Read-only for PMs, Full for Admin/HR."""
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated): return False
        role = getattr(u, "role", None)
        if u.is_superuser or role in [User.Role.ADMIN, User.Role.HR]:
            return True
        if role == User.Role.PROJECT_MANAGER:
            return request.method in permissions.SAFE_METHODS
        return False

class IsHRManagement(permissions.BasePermission):
    """Compatibility class for HR views."""
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_superuser or getattr(u, "role", None) in [User.Role.ADMIN, User.Role.HR]))

class IsLeadPMOrManagement(permissions.BasePermission):
    """Stable combined class: Admin, PM, Team Head, or HR."""
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated): return False
        return bool(u.is_superuser or getattr(u, "role", None) in [
            User.Role.ADMIN, User.Role.PROJECT_MANAGER, User.Role.TEAM_HEAD, User.Role.HR
        ])

class IsUserListAuthorized(permissions.BasePermission):
    """Stable combined class for User list: PM Read-Only or Admin/HR Full."""
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated): return False
        role = getattr(u, "role", None)
        if u.is_superuser or role in [User.Role.ADMIN, User.Role.HR, User.Role.TEAM_HEAD]:
            return True
        if role == User.Role.PROJECT_MANAGER:
            return request.method in permissions.SAFE_METHODS
        return False


class IsSelfOrHRManagement(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        u = request.user
        is_hr = bool(
            u.is_superuser or getattr(u, "role", None) in [User.Role.ADMIN, User.Role.PROJECT_MANAGER, User.Role.HR]
        )
        if is_hr:
            return True
        return obj.id == u.id
