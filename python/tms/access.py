"""Queryset scoping helpers for role-based access (used by DRF viewsets).

Role matrix
-----------
admin / superuser : everything.
project_manager   : all projects and tasks, can write; cannot manage admins.
team_head         : tasks of their own department (plus tasks assigned to them).
specialist        : "Team Member" - only tasks assigned to them.
sales_manager     : read-only over all projects and tasks.
client            : legacy; single linked project, limited review actions.
"""
from __future__ import annotations

from django.db.models import Q, QuerySet

from accounts.models import User

MANAGER_ROLES = (User.Role.ADMIN, User.Role.PROJECT_MANAGER)

# State slugs that count as finished work in dashboards.
DONE_STATE_SLUGS = ("approved", "launched_completed", "launched", "done", "completed")


def is_admin(user: User) -> bool:
    return bool(user.is_authenticated and (user.is_superuser or user.role == User.Role.ADMIN))


def is_manager(user: User) -> bool:
    """Admin or project manager."""
    return bool(user.is_authenticated and (user.is_superuser or user.role in MANAGER_ROLES))


def user_department_id(user: User) -> int | None:
    profile = getattr(user, "tms_profile", None)
    return profile.department_id if profile else None


def user_client_project_id(user: User) -> int | None:
    profile = getattr(user, "tms_profile", None)
    return profile.client_project_id if profile else None


def _team_head_filter(user: User) -> Q:
    dept_id = user_department_id(user)
    if not dept_id:
        return Q(assignee=user)
    return (
        Q(department_id=dept_id)
        | Q(assignee__tms_profile__department_id=dept_id)
        | Q(assignee=user)
    )


def work_items_for_user(user: User, include_archived=False) -> QuerySet:
    """Return a queryset of WorkItem visible to the given user (before optional filters)."""
    from tms.models import WorkItem

    qs = WorkItem.objects.all()
    if not include_archived:
        qs = qs.filter(is_active=True)

    base: QuerySet = qs.select_related(
        "project",
        "state",
        "module",
        "assignee",
        "cycle",
        "department",
        "created_by",
    ).prefetch_related("labels", "time_logs")

    if not user.is_authenticated:
        return base.none()
    if is_manager(user) or user.role == User.Role.SALES_MANAGER:
        return base
    if user.role == User.Role.CLIENT:
        pid = user_client_project_id(user)
        return base.filter(project_id=pid) if pid else base.none()
    if user.role == User.Role.TEAM_HEAD:
        return base.filter(_team_head_filter(user)).distinct()
    if user.role == User.Role.SPECIALIST:
        return base.filter(assignee=user)
    return base.none()


def projects_for_user(user: User, include_archived=False) -> QuerySet:
    from tms.models import Project

    qs = Project.objects.all()
    if not include_archived:
        qs = qs.filter(is_active=True)
    if not user.is_authenticated:
        return qs.none()
    if is_manager(user) or user.role == User.Role.SALES_MANAGER:
        return qs
    if user.role == User.Role.CLIENT:
        pid = user_client_project_id(user)
        return qs.filter(pk=pid) if pid else qs.none()
    if user.role == User.Role.TEAM_HEAD:
        dept_id = user_department_id(user)
        if not dept_id:
            return qs.filter(work_items__assignee=user).distinct()
        return qs.filter(
            Q(work_items__department_id=dept_id)
            | Q(work_items__assignee__tms_profile__department_id=dept_id)
            | Q(work_items__assignee=user)
        ).distinct()
    if user.role == User.Role.SPECIALIST:
        return qs.filter(work_items__assignee=user).distinct()
    return qs.none()


def can_edit_work_item(user: User, work_item) -> bool:
    """Whether the user may change task fields (not only read)."""
    if not user.is_authenticated:
        return False
    if is_manager(user):
        return True
    if user.role == User.Role.SALES_MANAGER:
        return False
    if user.role == User.Role.CLIENT:
        return work_item.project_id == user_client_project_id(user)
    if user.role == User.Role.TEAM_HEAD:
        if work_item.assignee_id == user.id:
            return True
        dept_id = user_department_id(user)
        if not dept_id:
            return False
        if work_item.department_id == dept_id:
            return True
        assignee = work_item.assignee
        return bool(assignee and user_department_id(assignee) == dept_id)
    if user.role == User.Role.SPECIALIST:
        return work_item.assignee_id == user.id
    return False


def can_create_work_item(user: User) -> bool:
    return is_manager(user) or user.role == User.Role.TEAM_HEAD


def can_manage_user(actor: User, target: User) -> bool:
    """Admins manage everyone; project managers manage non-admin users only."""
    if is_admin(actor):
        return True
    if actor.role == User.Role.PROJECT_MANAGER:
        return not (target.is_superuser or target.role == User.Role.ADMIN)
    return False


def can_assign_role(actor: User, role: str) -> bool:
    """Only admins may hand out admin / project-manager roles."""
    if is_admin(actor):
        return True
    if actor.role == User.Role.PROJECT_MANAGER:
        return role not in (User.Role.ADMIN, User.Role.PROJECT_MANAGER)
    return False


def client_may_approve_work_item(user: User, work_item) -> bool:
    """Client users may move tasks from client_review toward approved (limited transition)."""
    if user.role != User.Role.CLIENT:
        return True
    return work_item.project_id == user_client_project_id(user)
