import os
import subprocess
from django.conf import settings
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from tms.notify import notify_user

from tms import access
from tms.models import (
    ActivityLog,
    Cycle,
    CycleMember,
    Department,
    JobTitle,
    Label,
    Module,
    Notification,
    Project,
    ProjectMember,
    State,
    TimeLog,
    WorkItem,
    WorkItemAttachment,
    WorkItemComment,
    Backup,
)
from tms.permissions import (
    BlockSalesWrites, IsAdminRole, IsPMOrAdmin, IsLeadPMOrAdmin, 
    IsHRManagement, IsAgencyManagerOrHR, IsPMReadOrAbove,
    IsLeadPMOrManagement, IsUserListAuthorized, IsSelfOrHRManagement
)
from tms.serializers import (
    ActivityLogSerializer,
    BackupSerializer,
    CycleMemberSerializer,
    CycleSerializer,
    DepartmentSerializer,
    JobTitleSerializer,
    LabelSerializer,
    ModuleSerializer,
    NotificationSerializer,
    ProjectMemberSerializer,
    ProjectSerializer,
    StateSerializer,
    TimeLogSerializer,
    UserBriefSerializer,
    UserSerializer,
    WorkItemAttachmentSerializer,
    WorkItemCommentSerializer,
    WorkItemSerializer,
)


class SalesSafeViewSet(viewsets.ModelViewSet):
    """Applies sales-manager read-only guard to mutating HTTP methods."""

    permission_classes = [permissions.IsAuthenticated, BlockSalesWrites]


class DepartmentViewSet(SalesSafeViewSet):
    serializer_class = DepartmentSerializer

    def get_queryset(self):
        qs = Department.objects.all()
        # Include archived if targeting a specific ID for recovery or requested
        if self.kwargs.get('pk') or self.request.query_params.get("archived") == "true":
            return qs
        return qs.filter(is_active=True)

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [permissions.IsAuthenticated(), IsAgencyManagerOrHR()]
        return super().get_permissions()

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        instance = self.get_object()
        instance.is_active = True
        instance.save(update_fields=["is_active"])
        return Response({"status": "department restored"})


class JobTitleViewSet(SalesSafeViewSet):
    serializer_class = JobTitleSerializer

    def get_queryset(self):
        qs = JobTitle.objects.all()
        if self.kwargs.get('pk') or self.request.query_params.get("archived") == "true":
            return qs
        return qs.filter(is_active=True)

    def list(self, request, *args, **kwargs):
        if not JobTitle.objects.exists():
            DEFAULTS = [
                'Agency Manager',
                'Creative Director',
                'Project Manager',
                'Team Lead',
                'Senior Strategist',
                'Content Creator',
                'Graphic Designer',
                'Video Editor',
                'Social Media Manager',
                'HR Manager',
            ]
            for title in DEFAULTS:
                JobTitle.objects.get_or_create(name=title, defaults={'is_active': True})
        return super().list(request, *args, **kwargs)

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsAgencyManagerOrHR()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(_activity_user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(_activity_user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        instance = self.get_object()
        instance.is_active = True
        instance.save(update_fields=["is_active"])
        return Response({"status": "job title restored"})


class UserViewSet(SalesSafeViewSet):
    serializer_class = UserSerializer

    def get_queryset(self):
        include_archived = self.kwargs.get('pk') or self.request.query_params.get("archived") == "true"
        return access.users_for_user(self.request.user, include_archived=include_archived).select_related("tms_profile")

    def get_permissions(self):
        if self.action in ("update", "partial_update", "retrieve"):
            return [permissions.IsAuthenticated(), IsSelfOrHRManagement()]
        if self.action == "list":
            # Agency Manager, HR, PM, and Team Head can list users (filtered by queryset)
            return [permissions.IsAuthenticated(), IsUserListAuthorized()]
        if self.action in ("create", "destroy", "restore"):
            # ONLY Agency Manager (Admin) and HR can create/remove/recover
            return [permissions.IsAuthenticated(), IsAgencyManagerOrHR()]
        if self.action == "assignable":
            return [permissions.IsAuthenticated(), BlockSalesWrites()]
        if self.action == "me":
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), BlockSalesWrites()]

    def perform_update(self, serializer):
        serializer.save(_activity_user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance._activity_user = self.request.user
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        instance = self.get_object()
        instance.is_active = True
        instance._activity_user = request.user
        instance.save(update_fields=["is_active"])
        return Response({"status": "user restored"})

    @action(detail=False, methods=["get"])
    def me(self, request):
        ser = UserSerializer(request.user, context={"request": request})
        return Response(ser.data)

    @action(detail=False, methods=["get"], url_path="assignable")
    def assignable(self, request):
        u = request.user
        if not (
            u.is_superuser
            or u.role == User.Role.ADMIN
            or u.role == User.Role.PROJECT_MANAGER
            or u.role == User.Role.TEAM_HEAD
        ):
            return Response([])
        qs = User.objects.filter(is_active=True, is_superuser=False).order_by("first_name", "last_name")[:300]
        return Response(UserBriefSerializer(qs, many=True).data)


class ProjectViewSet(SalesSafeViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        from django.db.models.functions import Coalesce
        from django.db.models import Value
        include_archived = self.kwargs.get('pk') or self.request.query_params.get("archived") == "true"
        qs = access.projects_for_user(self.request.user, include_archived=include_archived)
        return qs.annotate(total_minutes=Coalesce(Sum("work_items__time_logs__minutes"), Value(0)))

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsPMOrAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(_activity_user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(_activity_user=self.request.user)

    def perform_destroy(self, instance):
        u = self.request.user
        if not (u.is_superuser or u.role in [User.Role.ADMIN, User.Role.PROJECT_MANAGER, User.Role.SALES_MANAGER]):
            raise PermissionDenied("Only admins, project managers, and strategists can delete projects.")
        instance._activity_user = u
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        u = self.request.user
        if not (u.is_superuser or u.role in [User.Role.ADMIN, User.Role.PROJECT_MANAGER, User.Role.SALES_MANAGER]):
            raise PermissionDenied("Only admins, project managers, and strategists can restore projects.")
        instance = self.get_object()
        instance.is_active = True
        instance._activity_user = u
        instance.save(update_fields=["is_active"])
        return Response({"status": "project restored"})


class ModuleViewSet(SalesSafeViewSet):
    serializer_class = ModuleSerializer

    def get_queryset(self):
        qs = Module.objects.all()
        if self.kwargs.get('pk') or self.request.query_params.get("archived") == "true":
            return qs
        return qs.filter(is_active=True)

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [permissions.IsAuthenticated(), IsAgencyManagerOrHR()]
        return [permissions.IsAuthenticated(), BlockSalesWrites()]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        instance = self.get_object()
        instance.is_active = True
        instance.save(update_fields=["is_active"])
        return Response({"status": "module restored"})


class StateViewSet(SalesSafeViewSet):
    serializer_class = StateSerializer

    def get_queryset(self):
        qs = State.objects.all()
        if self.kwargs.get('pk') or self.request.query_params.get("archived") == "true":
            return qs
        return qs.filter(is_active=True)

    def list(self, request, *args, **kwargs):
        # SELF-SEEDING BRAIN: If empty, create the Elite Workflow states automatically
        if not State.objects.exists():
            DEFAULTS = [
                ('backlog', 'Pending', '#64748b', 0),
                ('to-do', 'To Do', '#6366f1', 10),
                ('in-progress', 'In Progress', '#3b82f6', 20),
                ('team-head-review', 'Team Head Review', '#f59e0b', 40),
                ('client-review', 'Client Review', '#8b5cf6', 50),
                ('rework-revision', 'Rework / Revision', '#ef4444', 60),
                ('completed-launched', 'Completed / Launched', '#10b981', 100),
            ]
            for slug, name, color, order in DEFAULTS:
                State.objects.get_or_create(
                    slug=slug,
                    defaults={'name': name, 'color': color, 'sort_order': order, 'is_active': True}
                )
        
        # Ensure all states are active if they exist but are hidden
        
        return super().list(request, *args, **kwargs)

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [permissions.IsAuthenticated(), IsPMOrAdmin()]
        return [permissions.IsAuthenticated(), BlockSalesWrites()]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        instance = self.get_object()
        instance.is_active = True
        instance.save(update_fields=["is_active"])
        return Response({"status": "state restored"})


class LabelViewSet(SalesSafeViewSet):
    serializer_class = LabelSerializer

    def get_queryset(self):
        qs = Label.objects.all()
        if self.kwargs.get('pk') or self.request.query_params.get("archived") == "true":
            return qs
        return qs.filter(is_active=True)

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [permissions.IsAuthenticated(), IsPMOrAdmin()]
        return [permissions.IsAuthenticated(), BlockSalesWrites()]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class CycleViewSet(SalesSafeViewSet):
    serializer_class = CycleSerializer

    def get_queryset(self):
        u = self.request.user
        include_archived = self.kwargs.get('pk') or self.request.query_params.get("archived") == "true"
        qs = Cycle.objects.all().select_related("project")
        if not include_archived:
            qs = qs.filter(is_active=True)
        projects = access.projects_for_user(u, include_archived=include_archived)
        return qs.filter(project__in=projects)

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsPMOrAdmin()]
        return super().get_permissions()

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class CycleMemberViewSet(SalesSafeViewSet):
    serializer_class = CycleMemberSerializer

    def get_queryset(self):
        u = self.request.user
        pids = access.projects_for_user(u).values_list("id", flat=True)
        cids = Cycle.objects.filter(project_id__in=pids).values_list("id", flat=True)
        return CycleMember.objects.filter(cycle_id__in=cids).select_related("user", "cycle")

    def get_permissions(self):
        if self.action in ("create", "destroy"):
            return [permissions.IsAuthenticated(), IsPMOrAdmin()]
        return super().get_permissions()


class WorkItemViewSet(SalesSafeViewSet):
    serializer_class = WorkItemSerializer
    filterset_fields = ("project", "state", "module", "assignee", "cycle", "posting_date", "due_date", "deadline")
    search_fields = ("title", "task_code", "description")

    def get_queryset(self):
        include_archived = self.kwargs.get('pk') or self.request.query_params.get("archived") == "true"
        qs = access.work_items_for_user(self.request.user, include_archived=include_archived)
        slug = self.request.query_params.get("project_slug")
        if slug:
            qs = qs.filter(project__slug=slug)
        return qs

    def perform_create(self, serializer):
        u = self.request.user
        if not (
            u.is_superuser
            or u.role == User.Role.ADMIN
            or u.role == User.Role.PROJECT_MANAGER
        ):
            raise PermissionDenied("Only Agency Managers or Project Managers can create tasks.")
        serializer.save(_activity_user=u)

    def perform_update(self, serializer):
        u = self.request.user
        inst = serializer.instance
        if not access.can_edit_work_item(u, inst):
            raise PermissionDenied("You cannot edit this task.")

        # Enforcement: Only PM/Admin can approve or move to final review
        new_state_id = self.request.data.get("state")
        if new_state_id:
            try:
                new_state = State.objects.get(pk=new_state_id)
                if new_state.slug in ("client-review", "completed-launched") and new_state.id != inst.state_id:
                    if not (u.is_superuser or u.role in (User.Role.ADMIN, User.Role.PROJECT_MANAGER, User.Role.TEAM_HEAD)):
                        raise PermissionDenied("Only Leads, Managers or Admins can approve work for Client Review or Completion.")
                
                # Notify Team Head when work is done and ready for review
                if new_state.slug == "team-head-review" and inst.state_id != new_state.id:
                    ths = User.objects.filter(role=User.Role.TEAM_HEAD, is_active=True)
                    if inst.assignee and inst.assignee.title:
                        ths = ths.filter(title=inst.assignee.title)
                        for th in ths:
                            notify_user(
                                user_id=th.id,
                                title="Task Ready for Review 📋",
                                body=f"Task '{inst.task_code}' has been moved to Team Head Review by {u.get_full_name() or u.email}.",
                                link=f"/task/{inst.id}"
                            )
            except State.DoesNotExist:
                pass

        # If TEAM_HEAD, restrict editing to ONLY the state field.
        # If TEAM_HEAD, restrict editing to ONLY the state field and tactical dates.
        if u.role == User.Role.TEAM_HEAD and not u.is_superuser:
            allowed_fields = ["state", "posting_date", "due_date", "deadline", "scheduled_date", "board_position"]
            data = self.request.data
            
            update_fields = ["updated_at"]
            modified = False
            
            if "state" in data:
                inst.state_id = data["state"]
                update_fields.append("state_id")
                modified = True
            
            if "board_position" in data:
                inst.board_position = data["board_position"]
                update_fields.append("board_position")
                modified = True
            
            for f in ["posting_date", "due_date", "deadline", "scheduled_date"]:
                if f in data:
                    val = data[f]
                    if val == "": val = None
                    setattr(inst, f, val)
                    update_fields.append(f)
                    modified = True
            
            if modified:
                inst._activity_user = u
                inst.save(update_fields=update_fields)
                return
            else:
                raise PermissionDenied("Team Heads are permitted to update status and tactical dates.")

        serializer.save(_activity_user=u)

    def perform_destroy(self, instance):
        u = self.request.user
        if not (u.is_superuser or u.role in [User.Role.ADMIN, User.Role.PROJECT_MANAGER, User.Role.SALES_MANAGER]):
            raise PermissionDenied("Only Agency Managers, Project Managers, and Strategists can delete tasks.")
        instance._activity_user = u
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        u = self.request.user
        if not (u.is_superuser or u.role in [User.Role.ADMIN, User.Role.PROJECT_MANAGER, User.Role.SALES_MANAGER]):
            raise PermissionDenied("Only Agency Managers, Project Managers, and Strategists can restore tasks.")
        instance = self.get_object()
        instance.is_active = True
        instance._activity_user = u
        instance.save(update_fields=["is_active"])
        return Response({"status": "work item restored"})

    @action(detail=True, methods=["post"], url_path="record-view")
    def record_view(self, request, pk=None):
        item = self.get_object()
        u = request.user
        # Don't notify if the viewer is the creator or if there is no creator
        if item.created_by and u != item.created_by:
            notify_user(
                user_id=item.created_by.id,
                title="Task Viewed",
                body=f"'{u.get_full_name() or u.email}' is currently viewing task: {item.task_code}",
                link=f"/task/{item.id}"
            )
        return Response({"status": "view_recorded"})

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        """Kanban drag-drop: [{\"id\": 1, \"state\": 3, \"board_position\": 0}, ...]"""
        u = request.user
        if u.role == User.Role.SALES_MANAGER:
            raise PermissionDenied()
        items = request.data
        if not isinstance(items, list):
            return Response({"detail": "Expected a list."}, status=status.HTTP_400_BAD_REQUEST)
        for row in items:
            pk = row.get("id")
            state_id = row.get("state")
            pos = row.get("board_position", 0)
            try:
                wi = WorkItem.objects.get(pk=pk)
            except WorkItem.DoesNotExist:
                continue
            if not access.can_edit_work_item(u, wi):
                continue
            if state_id is not None:
                wi.state_id = state_id
            wi.board_position = pos
            wi._activity_user = u
            wi.save(update_fields=["state_id", "board_position", "updated_at"])
        return Response({"status": "ok"})


class WorkItemCommentViewSet(SalesSafeViewSet):
    serializer_class = WorkItemCommentSerializer
    filterset_fields = ("work_item",)

    def get_queryset(self):
        visible = access.work_items_for_user(self.request.user).values_list("id", flat=True)
        return WorkItemComment.objects.filter(work_item_id__in=visible).select_related(
            "author", "work_item"
        )

    def perform_create(self, serializer):
        wi = serializer.validated_data["work_item"]
        if not access.work_items_for_user(self.request.user).filter(pk=wi.pk).exists():
            raise PermissionDenied()
        if self.request.user.role == User.Role.SALES_MANAGER:
            raise PermissionDenied()
        serializer.save()


class WorkItemAttachmentViewSet(SalesSafeViewSet):
    serializer_class = WorkItemAttachmentSerializer
    filterset_fields = ("work_item",)

    def get_queryset(self):
        visible = access.work_items_for_user(self.request.user).values_list("id", flat=True)
        return WorkItemAttachment.objects.filter(work_item_id__in=visible)

    def perform_create(self, serializer):
        wi = serializer.validated_data["work_item"]
        if not access.work_items_for_user(self.request.user).filter(pk=wi.pk).exists():
            raise PermissionDenied()
        if self.request.user.role == User.Role.SALES_MANAGER:
            raise PermissionDenied()
        serializer.save()


class TimeLogViewSet(SalesSafeViewSet):
    serializer_class = TimeLogSerializer
    filterset_fields = ("work_item",)

    def get_queryset(self):
        visible = access.work_items_for_user(self.request.user).values_list("id", flat=True)
        return TimeLog.objects.filter(work_item_id__in=visible).select_related("user", "work_item")

    def perform_create(self, serializer):
        wi = serializer.validated_data["work_item"]
        if not access.work_items_for_user(self.request.user).filter(pk=wi.pk).exists():
            raise PermissionDenied()
        if self.request.user.role == User.Role.SALES_MANAGER:
            raise PermissionDenied()
        serializer.save()


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())[:100]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        n = self.get_object()
        n.read = True
        n.save(update_fields=["read"])
        return Response({"status": "ok"})

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, read=False).update(read=True)
        return Response({"status": "ok"})


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ActivityLogSerializer

    def get_queryset(self):
        u = self.request.user
        qs = ActivityLog.objects.select_related("project", "user")
        if u.is_superuser or u.role in (User.Role.ADMIN, User.Role.SALES_MANAGER):
            return qs
        if u.role == User.Role.CLIENT:
            pid = access.user_client_project_id(u)
            return qs.filter(project_id=pid) if pid else qs.none()
        proj_ids = access.projects_for_user(u).values_list("id", flat=True)
        return qs.filter(project_id__in=proj_ids).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())[:50]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ProjectMemberViewSet(SalesSafeViewSet):
    serializer_class = ProjectMemberSerializer

    def get_queryset(self):
        pids = access.projects_for_user(self.request.user).values_list("id", flat=True)
        return ProjectMember.objects.filter(project_id__in=pids)

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [permissions.IsAuthenticated(), IsPMOrAdmin()]
        return [permissions.IsAuthenticated(), BlockSalesWrites()]


class AnalyticsSummaryView(APIView):
    """
    Dashboard metrics: workload, completed vs pending, per-project and per-department rollups.
    Query params: project (slug), department (id).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        u = request.user
        wis = access.work_items_for_user(u, lightweight=True)
        
        # Performance/Personal toggle
        is_personal = request.query_params.get("personal") == "true"
        if is_personal:
            wis = wis.filter(assignee=u)

        project_slug = request.query_params.get("project")
        if project_slug:
            wis = wis.filter(project__slug=project_slug)
            
        assignee_id = request.query_params.get("assignee")
        if assignee_id:
            wis = wis.filter(assignee_id=assignee_id)

        dept_id = request.query_params.get("department")
        if dept_id:
            wis = wis.filter(
                Q(department_id=dept_id) | Q(assignee__tms_profile__department_id=dept_id)
            )
            
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        
        log_filter = Q()
        if start_date: log_filter &= Q(created_at__date__gte=start_date)
        if end_date: log_filter &= Q(created_at__date__lte=end_date)
            
        total = wis.count()
        
        if start_date or end_date:
            # Include tasks that are STILL pending (carried over), OR were created/logged in this date range
            terminal_states = ['completed-launched', 'completed', 'launched', 'done', 'archived']
            wis = wis.filter(
                ~Q(state__slug__in=terminal_states) |
                Q(log_filter) | 
                Q(time_logs__in=TimeLog.objects.filter(log_filter))
            ).distinct()
            total = wis.count() # Update total for the filtered view
            
        time_logs_in_range = TimeLog.objects.filter(log_filter)
        if assignee_id:
            time_logs_in_range = time_logs_in_range.filter(user_id=assignee_id)
        total_time = time_logs_in_range.aggregate(total=Sum('minutes'))['total'] or 0
        terminal = wis.filter(state__slug__in=["launched", "completed-launched"]).count()
        by_state = list(
            wis.values("state__slug", "state__name").annotate(c=Count("id")).order_by()
        )
        workload = list(
            wis.exclude(assignee__isnull=True)
            .values("assignee_id", "assignee__first_name", "assignee__last_name")
            .annotate(open_tasks=Count("id"))
            .order_by("-open_tasks")[:25]
        )
        by_module = list(wis.values("module__slug", "module__name").annotate(c=Count("id")))
        by_project = list(
            wis.values("project_id", "project__slug", "project__name", "project__color").annotate(c=Count("id")).order_by("-c")
        )

        # Dynamic Historical trend: 30 days for 'Month' mode, 90 days for 'All Time' mode
        now = timezone.now()
        days_to_show = 29 if start_date else 89
        start_trend = (now - timezone.timedelta(days=days_to_show)).date()
        
        # Activity trend: Based on TimeLogs created per day
        activity_logs = TimeLog.objects.filter(created_at__gte=start_trend)
        if assignee_id:
            activity_logs = activity_logs.filter(user_id=assignee_id)
            
        created_counts = dict(
            activity_logs.values("created_at__date")
            .annotate(c=Count("id"))
            .values_list("created_at__date", "c")
        )
        
        # Completion trend: Based on tasks reaching terminal states per day
        completed_counts = dict(
            wis.filter(
                state__slug__in=['completed-launched', 'completed', 'launched', 'done'], 
                updated_at__gte=start_trend
            )
            .values("updated_at__date")
            .annotate(c=Count("id"))
            .values_list("updated_at__date", "c")
        )

        trend_list = []
        for i in range(days_to_show, -1, -1):
            day = (now - timezone.timedelta(days=i)).date()
            day_str = day.strftime("%Y-%m-%d")
            # We provide both velocity (completions) and activity (logs)
            trend_list.append({
                "date": day_str,
                "velocity": completed_counts.get(day, 0),
                "activity": created_counts.get(day, 0)
            })

        completed_or_launched = wis.filter(
            Q(state__slug__in=['completed-launched', 'completed', 'launched', 'done'])
        ).count()
        
        # Heuristic Efficiency: (Completed * 60) / Total Time
        efficiency = 0
        if total_time > 0:
            efficiency = min(100, int((completed_or_launched * 90) / total_time * 100))
        elif completed_or_launched > 0:
            efficiency = 100

        return Response(
            {
                "generated_at": timezone.now().isoformat(),
                "totals": {
                    "all": total,
                    "completed_or_launched": completed_or_launched,
                    "pending": total - completed_or_launched,
                    "total_time_minutes": total_time,
                    "efficiency": efficiency,
                },
                "by_state": by_state,
                "by_module": by_module,
                "by_project": by_project,
                "assignee_workload": workload,
                "historical_trend": trend_list,
            }
        )


class CycleProgressView(APIView):
    """Per-cycle task counts for sprint tracking."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, cycle_id: int):
        u = request.user
        try:
            cy = Cycle.objects.select_related("project").get(pk=cycle_id)
        except Cycle.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if cy.project not in access.projects_for_user(u):
            return Response(status=status.HTTP_403_FORBIDDEN)
        items = WorkItem.objects.filter(cycle=cy)
        by_state = list(items.values("state__slug", "state__name").annotate(c=Count("id")))
        return Response({"cycle_id": cy.id, "name": cy.name, "by_state": by_state})

import zipfile
import io
import csv
from django.http import HttpResponse



from fpdf import FPDF

class AgencyReportPDF(FPDF):
    def __init__(self, month_str):
        super().__init__()
        self.month_str = month_str

    def header(self):
        if self.page_no() == 1:
            self.set_fill_color(15, 23, 42)  # Slate 900
            self.rect(0, 0, 210, 50, 'F')
            self.set_font('helvetica', 'B', 28)
            self.set_text_color(255, 255, 255)
            self.set_xy(15, 15)
            self.cell(0, 10, 'COLOUR PARROT', ln=True)
            self.set_font('helvetica', '', 12)
            self.set_text_color(148, 163, 184)
            self.set_xy(15, 28)
            self.cell(0, 10, f'Monthly Agency Performance Center - {self.month_str}', ln=True)
            self.ln(25)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f'Page {self.page_no()} | Generated by CP-Intelligence', align='C')

    def chapter_title(self, title):
        self.set_font('helvetica', 'B', 16)
        self.set_text_color(30, 41, 59)
        self.cell(0, 10, title, ln=True)
        self.ln(2)
        self.set_draw_color(59, 130, 246)
        self.set_line_width(0.5)
        self.line(self.get_x(), self.get_y(), self.get_x() + 180, self.get_y())
        self.ln(6)

class BackupViewSet(viewsets.ModelViewSet):
    queryset = Backup.objects.all()
    serializer_class = BackupSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated(), IsAdminRole()]

    @action(detail=False, methods=["post"], url_path="trigger-manual")
    def trigger_manual(self, request):
        from django.core.management import call_command
        # Run for 2 months ago (April)
        call_command('run_monthly_backup', months_ago=2)
        # Run for 1 month ago (May)
        call_command('run_monthly_backup', months_ago=1)
        return Response({"status": "Manual backup generation triggered for the last 2 months."})

    @action(detail=True, methods=["post"], url_path="approve-and-download")
    def approve_and_download(self, request, pk=None):
        backup = self.get_object()
        
        backup.is_approved = True
        backup.approved_by = request.user
        backup.approved_at = timezone.now()
        backup.save()

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as zip_file:
            # 1-5: CSV Files (Previously implemented)
            projects = Project.objects.filter(is_active=True)
            for project in projects:
                prefix = f"{project.slug}/"
                
                ov_out = io.StringIO()
                ov_w = csv.writer(ov_out)
                ov_w.writerow(['Project Name', 'Slug', 'Created At', 'Total Tasks', 'Total Time Logged'])
                total_t = WorkItem.objects.filter(project=project).count()
                total_m = TimeLog.objects.filter(work_item__project=project).aggregate(t=Sum('minutes'))['t'] or 0
                ov_w.writerow([project.name, project.slug, project.created_at, total_t, total_m])
                zip_file.writestr(f"{prefix}Project_Overview.csv", ov_out.getvalue())

                t_out = io.StringIO()
                t_w = csv.writer(t_out)
                t_w.writerow(['Task Code', 'Title', 'Project', 'Module', 'State', 'Priority', 'Assignee', 'Created At', 'Posting Date', 'Scheduled Date', 'Due Date', 'Deadline', 'Rework Count', 'State Time (Min)', 'Reference Links', 'Description'])
                for item in WorkItem.objects.filter(project=project).select_related('state', 'module', 'assignee'):
                    assignee_str = "Unassigned"
                    if item.assignee:
                        assignee_str = item.assignee.get_full_name().strip() or item.assignee.email
                    
                    state_info = " | ".join([f"{s}: {m}m" for s, m in (item.state_durations or {}).items()])
                    
                    t_w.writerow([
                        item.task_code, 
                        item.title, 
                        item.project.name if item.project else "Unlinked",
                        item.module.name if item.module else "", 
                        item.state.name if item.state else "N/A", 
                        item.priority, 
                        assignee_str, 
                        item.created_at.strftime("%d/%m/%Y %H:%M") if item.created_at else "", 
                        item.posting_date or "", 
                        item.scheduled_date or "",
                        item.due_date or "", 
                        item.deadline or "", 
                        item.rework_count,
                        state_info,
                        item.reference_link or "", 
                        item.description or ""
                    ])
                zip_file.writestr(f"{prefix}Tasks_Detailed.csv", t_out.getvalue())

                c_out = io.StringIO()
                c_w = csv.writer(c_out)
                c_w.writerow(['Task Code', 'Author', 'Comment Body', 'Timestamp'])
                for c in WorkItemComment.objects.filter(work_item__project=project).select_related('author', 'work_item'):
                    author_str = "Unassigned"
                    if c.author:
                        author_str = c.author.get_full_name().strip() or c.author.email
                    c_w.writerow([c.work_item.task_code, author_str, c.body, c.created_at.strftime("%d/%m/%Y %H:%M") if c.created_at else ""])
                zip_file.writestr(f"{prefix}All_Task_Comments.csv", c_out.getvalue())

                l_out = io.StringIO()
                l_w = csv.writer(l_out)
                l_w.writerow(['Task Code', 'User', 'Minutes', 'Logged Date', 'Note'])
                for log in TimeLog.objects.filter(work_item__project=project).select_related('user', 'work_item'):
                    user_str = "Unassigned"
                    if log.user:
                        user_str = log.user.get_full_name().strip() or log.user.email
                    l_w.writerow([log.work_item.task_code, user_str, log.minutes, log.logged_at.strftime("%d/%m/%Y %H:%M") if log.logged_at else "", log.note or ""])
                zip_file.writestr(f"{prefix}Detailed_Time_Logs.csv", l_out.getvalue())

                a_out = io.StringIO()
                a_w = csv.writer(a_out)
                a_w.writerow(['Task Code', 'File', 'Size', 'User'])
                for a in WorkItemAttachment.objects.filter(work_item__project=project).select_related('uploaded_by', 'work_item'):
                    up_str = "Unassigned"
                    if a.uploaded_by:
                        up_str = a.uploaded_by.get_full_name().strip() or a.uploaded_by.email
                    a_w.writerow([a.work_item.task_code, a.file_name, a.size_bytes, up_str])
                zip_file.writestr(f"{prefix}Attachments_Manifest.csv", a_out.getvalue())

                # Activity Log Export
                act_out = io.StringIO()
                act_w = csv.writer(act_out)
                act_w.writerow(['Date', 'User', 'Action', 'Entity Type', 'Entity ID', 'Details'])
                for entry in ActivityLog.objects.filter(project=project).select_related('user'):
                    entry_user_str = "System"
                    if entry.user:
                        entry_user_str = entry.user.get_full_name().strip() or entry.user.email
                    act_w.writerow([
                        entry.created_at.strftime("%d/%m/%Y %H:%M") if entry.created_at else "", 
                        entry_user_str, 
                        entry.action, 
                        entry.entity_type, 
                        entry.entity_id, 
                        str(entry.payload) if entry.payload else ""
                    ])
                zip_file.writestr(f"{prefix}System_Activity_Log.csv", act_out.getvalue())

            # 7. Suggestion 2: BEAUTIFUL PDF PERFORMANCE REPORT
            try:
                pdf = AgencyReportPDF(backup.month)
                pdf.add_page()
                
                # Section 1: Executive Summary
                pdf.chapter_title("Executive Summary")
                pdf.set_font('helvetica', '', 11)
                pdf.set_text_color(71, 85, 105)
                total_tasks = WorkItem.objects.filter(is_active=True).count()
                total_effort = TimeLog.objects.all().aggregate(t=Sum('minutes'))['t'] or 0
                pdf.multi_cell(0, 8, f"This report provides a high-level overview of agency performance for the month of {backup.month}. Currently, the agency is managing {total_tasks} active tasks with a combined effort of {total_effort} minutes logged across all projects.")
                pdf.ln(5)

                # Section 2: Top Contributors
                pdf.chapter_title("Top Agency Contributors")
                top_users = User.objects.filter(is_active=True).annotate(
                    finished=Count('assigned_work_items', filter=Q(assigned_work_items__state__slug__in=['launched', 'completed-launched']))
                ).order_by('-finished')[:5]
                
                pdf.set_font('helvetica', 'B', 10)
                pdf.set_fill_color(241, 245, 249)
                pdf.cell(100, 10, "Team Member", 1, 0, 'C', True)
                pdf.cell(80, 10, "Tasks Completed", 1, 1, 'C', True)
                
                pdf.set_font('helvetica', '', 10)
                for u in top_users:
                    pdf.cell(100, 10, f" {u.get_full_name()}", 1)
                    pdf.cell(80, 10, f" {u.finished}", 1, 1, 'C')
                pdf.ln(10)

                # Section 3: Project Effort
                pdf.chapter_title("Project Effort Distribution")
                top_projects = Project.objects.filter(is_active=True).annotate(
                    effort=Sum('work_items__time_logs__minutes')
                ).order_by('-effort')[:5]
                
                pdf.set_font('helvetica', 'B', 10)
                pdf.cell(100, 10, "Project Name", 1, 0, 'C', True)
                pdf.cell(80, 10, "Total Minutes Logged", 1, 1, 'C', True)
                
                pdf.set_font('helvetica', '', 10)
                for p in top_projects:
                    pdf.cell(100, 10, f" {p.name}", 1)
                    pdf.cell(80, 10, f" {p.effort or 0}", 1, 1, 'C')

                pdf_output = pdf.output()
                zip_file.writestr("Beautiful_Agency_Performance_Report.pdf", pdf_output)
            except Exception as pdf_err:
                zip_file.writestr("PDF_GENERATION_ERROR.txt", str(pdf_err))

            # 6. Database Snapshot
            try:
                db_s = settings.DATABASES['default']
                if 'postgresql' in db_s['ENGINE']:
                    env = os.environ.copy()
                    env["PGPASSWORD"] = db_s.get('PASSWORD', '')
                    d_cmd = ["pg_dump", "-h", db_s.get('HOST', 'localhost'), "-p", str(db_s.get('PORT', '5432')), "-U", db_s.get('USER', 'postgres'), "-F", "p", db_s.get('NAME', 'colour_parrot')]
                    proc = subprocess.run(d_cmd, env=env, capture_output=True, text=True)
                    if proc.returncode == 0:
                        zip_file.writestr("DATABASE_SAFE_BACKUP/colour_parrot_dump.sql", proc.stdout)
            except Exception as db_err:
                    zip_file.writestr("DATABASE_BACKUP_ERROR.txt", str(db_err))

        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="Full_Agency_Backup_{backup.month}.zip"'
        return response



