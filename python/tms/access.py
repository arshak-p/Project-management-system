"""Queryset scoping helpers for role-based access (used by DRF viewsets)."""
from __future__ import annotations

from typing import TYPE_CHECKING

from django.db.models import Q, QuerySet

from accounts.models import User

if TYPE_CHECKING:
    from tms.models import WorkItem


def user_department_id(user: User) -> int | None:
    profile = getattr(user, "tms_profile", None)
    return profile.department_id if profile else None


def user_client_project_id(user: User) -> int | None:
    profile = getattr(user, "tms_profile", None)
    return profile.client_project_id if profile else None


def work_items_for_user(user: User, include_archived=False) -> QuerySet:
    """Return a queryset of WorkItem visible to the given user (before optional filters)."""
    from tms.models import WorkItem

    qs = WorkItem.objects.all()
    if not include_archived:
        qs = qs.filter(is_active=True)

    base: QuerySet[WorkItem] = qs.select_related(
        "project",
        "state",
        "module",
        "assignee",
        "cycle",
        "department",
        "created_by",
    ).prefetch_related("labels")

    if not user.is_authenticated:
        return base.none()
    if user.is_superuser or user.role in (User.Role.ADMIN, User.Role.PROJECT_MANAGER):
        return base
    if user.role == User.Role.SALES_MANAGER:
        return base
    if user.role == User.Role.CLIENT:
        pid = user_client_project_id(user)
        if pid:
            return base.filter(project_id=pid)
        return base.none()
    if user.role == User.Role.PROJECT_MANAGER:
        return base
    if user.role == User.Role.TEAM_HEAD:
        dept_id = user_department_id(user)
        if not dept_id:
            return base.filter(assignee=user)
        return base.filter(
            Q(department_id=dept_id)
            | Q(assignee__tms_profile__department_id=dept_id)
            | Q(assignee=user)
        ).distinct()
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
    if user.is_superuser or user.role in (User.Role.ADMIN, User.Role.PROJECT_MANAGER, User.Role.SALES_MANAGER):
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
        ).distinct()
    if user.role == User.Role.SPECIALIST:
        return qs.filter(work_items__assignee=user).distinct()
    return qs.none()


def can_edit_work_item(user: User, work_item) -> bool:
    """Whether the user may change task fields (not only read)."""
    if not user.is_authenticated:
        return False
    if user.is_superuser or user.role == User.Role.ADMIN:
        return True
    if user.role == User.Role.SALES_MANAGER:
        return False
    if user.role == User.Role.CLIENT:
        return work_item.project_id == user_client_project_id(user)
    if user.role == User.Role.PROJECT_MANAGER:
        return True
    if user.role == User.Role.TEAM_HEAD:
        dept_id = user_department_id(user)
        if work_item.assignee_id == user.id:
            return True
        if dept_id and (
            work_item.department_id == dept_id
            or (
                work_item.assignee_id
                and user_department_id(work_item.assignee) == dept_id
            )
        ):
            return True
        return False
    if user.role == User.Role.SPECIALIST:
        return work_item.assignee_id == user.id
    return False


def client_may_approve_work_item(user: User, work_item) -> bool:
    """Client users may move tasks from client_review toward approved (limited transition)."""
    if user.role != User.Role.CLIENT:
        return True
    if work_item.project_id != user_client_project_id(user):
        return False
    # Actual state slugs checked in serializer; this is coarse gate.
    return True
