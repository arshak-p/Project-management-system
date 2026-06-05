from __future__ import annotations
from django.db.models import Q, QuerySet
from accounts.models import User
from tms.models import Project, WorkItem

def user_department_id(user: User) -> int | None:
    profile = getattr(user, "tms_profile", None)
    return profile.department_id if profile else None

def user_client_project_id(user: User) -> int | None:
    profile = getattr(user, "tms_profile", None)
    return profile.client_project_id if profile else None

def work_items_for_user(user: User, include_archived: bool = False, lightweight: bool = False) -> QuerySet[WorkItem]:
    qs = WorkItem.objects.all()
    if not include_archived:
        qs = qs.filter(is_active=True)

    if lightweight:
        base = qs
    else:
        base = qs.select_related(
            "project",
            "state",
            "module",
            "assignee",
            "content_writer",
            "cycle",
            "department",
            "created_by",
        ).prefetch_related("labels", "time_logs")

    if not user.is_authenticated:
        return base.none()
    if user.is_superuser or user.role in (User.Role.ADMIN, User.Role.PROJECT_MANAGER, User.Role.HR):
        return base
    if user.role == User.Role.SALES_MANAGER:
        return base
    if user.role == User.Role.CLIENT:
        pid = user_client_project_id(user)
        if pid:
            return base.filter(project_id=pid)
        return base.none()
    if user.role == User.Role.TEAM_HEAD:
        dept_id = user_department_id(user)
        user_title = getattr(user, "title", "")
        
        q_filter = Q(assignee=user)
        if dept_id:
            q_filter |= Q(department_id=dept_id) | Q(assignee__tms_profile__department_id=dept_id)
        if user_title:
            q_filter |= Q(assignee__title=user_title)
            
        return base.filter(q_filter).distinct()
    if user.role == User.Role.SPECIALIST:
        return base.filter(assignee=user)
    return base.none()

def projects_for_user(user: User, include_archived: bool = False) -> QuerySet:
    qs = Project.objects.all()
    if not include_archived:
        qs = qs.filter(is_active=True)

    if not user.is_authenticated:
        return qs.none()
        
    if user.role == User.Role.CLIENT:
        pid = user_client_project_id(user)
        if pid:
            return qs.filter(id=pid)
        return qs.none()
        
    # All internal staff (Admin, PM, HR, Sales, Team Head, Specialist) can see all projects
    return qs

def users_for_user(user: User, include_archived: bool = False) -> QuerySet[User]:
    """
    Agency Manager, HR, PM, and Strategist: All users.
    Team Head: Only see members with the same Job Title (or if Content Writer Team Head, see all Content Writers).
    """
    from accounts.models import User as AccountUser
    qs = AccountUser.objects.filter(is_superuser=False)
    if not include_archived:
        qs = qs.filter(is_active=True)

    if not user.is_authenticated:
        return qs.none()
    
    # Agency Manager (Admin), HR, Project Manager, and Strategist can see everyone
    if user.is_superuser or user.role in (
        AccountUser.Role.ADMIN,
        AccountUser.Role.PROJECT_MANAGER,
        AccountUser.Role.HR,
        AccountUser.Role.SALES_MANAGER,
    ):
        return qs

    # Team Head: Only see members with the same Job Title, or if Content Writer Team Head, see all Content Writers
    if user.role == AccountUser.Role.TEAM_HEAD:
        user_title = getattr(user, "title", "")
        if user_title:
            if "content writer" in user_title.lower():
                return qs.filter(title__icontains="content writer")
            return qs.filter(title=user_title)
        return qs.filter(id=user.id) # Fallback to just themselves

    # Specialists and others: Only see themselves
    return qs.filter(id=user.id)

def can_edit_work_item(user: User, work_item: WorkItem) -> bool:
    if not user.is_authenticated:
        return False
    if user.is_superuser or user.role == User.Role.ADMIN:
        return True
    if user.role == User.Role.SALES_MANAGER:
        return True
    if user.role == User.Role.CLIENT:
        return work_item.project_id == user_client_project_id(user)
    if user.role == User.Role.PROJECT_MANAGER:
        return True
    if user.role == User.Role.TEAM_HEAD:
        user_title = getattr(user, "title", "")
        # Content Writer Team Head can edit to assign/manage content writers
        if user_title and "content writer" in user_title.lower():
            return True

        if work_item.assignee_id == user.id:
            return True
            
        dept_id = user_department_id(user)
        
        # Check by Title (The new way)
        if user_title and work_item.assignee and work_item.assignee.title == user_title:
            return True
            
        # Check by Department (The legacy way)
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
        return work_item.assignee_id == user.id or work_item.content_writer_id == user.id
    return False

def client_may_approve_work_item(user: User, work_item: WorkItem) -> bool:
    if user.role != User.Role.CLIENT:
        return True
    if work_item.project_id != user_client_project_id(user):
        return False
    return True

