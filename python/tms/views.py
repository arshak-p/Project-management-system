"""REST viewsets for Colour Parrot TMS (scoped querysets + analytics)."""
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User

from tms import access
from tms.models import (
    ActivityLog,
    Cycle,
    CycleMember,
    Department,
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
)
from tms.permissions import BlockSalesWrites, IsAdminRole, IsPMOrAdmin
from tms.serializers import (
    ActivityLogSerializer,
    CycleMemberSerializer,
    CycleSerializer,
    DepartmentSerializer,
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
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [permissions.IsAuthenticated(), IsAdminRole()]
        return super().get_permissions()


class UserViewSet(SalesSafeViewSet):
    queryset = User.objects.filter(is_superuser=False).select_related("tms_profile").prefetch_related()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ("list", "create", "destroy", "update", "partial_update"):
            return [permissions.IsAuthenticated(), IsAdminRole()]
        if self.action == "assignable":
            return [permissions.IsAuthenticated(), BlockSalesWrites()]
        if self.action == "me":
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), BlockSalesWrites()]

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
        return access.projects_for_user(self.request.user)

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update"):
            return [permissions.IsAuthenticated(), IsPMOrAdmin()]
        if self.action == "destroy":
            return [permissions.IsAuthenticated(), IsAdminRole()]
        return super().get_permissions()

    def perform_destroy(self, instance):
        u = self.request.user
        if not (u.is_superuser or u.role == User.Role.ADMIN):
            raise PermissionDenied("Only admins can delete projects.")
        instance.delete()


class ModuleViewSet(SalesSafeViewSet):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [permissions.IsAuthenticated(), IsAdminRole()]
        return [permissions.IsAuthenticated(), BlockSalesWrites()]


class StateViewSet(SalesSafeViewSet):
    queryset = State.objects.all()
    serializer_class = StateSerializer

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [permissions.IsAuthenticated(), IsAdminRole()]
        return [permissions.IsAuthenticated(), BlockSalesWrites()]


class LabelViewSet(SalesSafeViewSet):
    queryset = Label.objects.all()
    serializer_class = LabelSerializer

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [permissions.IsAuthenticated(), IsAdminRole()]
        return [permissions.IsAuthenticated(), BlockSalesWrites()]


class CycleViewSet(SalesSafeViewSet):
    serializer_class = CycleSerializer

    def get_queryset(self):
        u = self.request.user
        qs = Cycle.objects.select_related("project")
        projects = access.projects_for_user(u)
        return qs.filter(project__in=projects)


class CycleMemberViewSet(SalesSafeViewSet):
    serializer_class = CycleMemberSerializer

    def get_queryset(self):
        u = self.request.user
        pids = access.projects_for_user(u).values_list("id", flat=True)
        cids = Cycle.objects.filter(project_id__in=pids).values_list("id", flat=True)
        return CycleMember.objects.filter(cycle_id__in=cids).select_related("user", "cycle")


class WorkItemViewSet(SalesSafeViewSet):
    serializer_class = WorkItemSerializer
    filterset_fields = ("project", "state", "module", "assignee", "cycle")
    search_fields = ("title", "task_code", "description")

    def get_queryset(self):
        qs = access.work_items_for_user(self.request.user)
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
            or u.role == User.Role.TEAM_HEAD
        ):
            raise PermissionDenied("Only admins and project managers can create tasks.")
        serializer.save()

    def perform_update(self, serializer):
        u = self.request.user
        inst = serializer.instance
        if not access.can_edit_work_item(u, inst):
            raise PermissionDenied("You cannot edit this task.")
        serializer.save()

    def perform_destroy(self, instance):
        u = self.request.user
        if not (u.is_superuser or u.role == User.Role.ADMIN):
            raise PermissionDenied("Only admins can delete tasks.")
        instance.delete()

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
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        n = self.get_object()
        n.read = True
        n.save(update_fields=["read"])
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
        return qs.filter(project_id__in=proj_ids)


class ProjectMemberViewSet(SalesSafeViewSet):
    serializer_class = ProjectMemberSerializer

    def get_queryset(self):
        pids = access.projects_for_user(self.request.user).values_list("id", flat=True)
        return ProjectMember.objects.filter(project_id__in=pids)

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [permissions.IsAuthenticated(), IsAdminRole()]
        return [permissions.IsAuthenticated(), BlockSalesWrites()]


class AnalyticsSummaryView(APIView):
    """
    Dashboard metrics: workload, completed vs pending, per-project and per-department rollups.
    Query params: project (slug), department (id).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        u = request.user
        wis = access.work_items_for_user(u)
        project_slug = request.query_params.get("project")
        if project_slug:
            wis = wis.filter(project__slug=project_slug)
        dept_id = request.query_params.get("department")
        if dept_id:
            wis = wis.filter(
                Q(department_id=dept_id) | Q(assignee__tms_profile__department_id=dept_id)
            )

        total = wis.count()
        terminal = wis.filter(state__slug__in=["approved", "launched_completed"]).count()
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
            wis.values("project_id", "project__slug", "project__name").annotate(c=Count("id")).order_by("-c")
        )

        # Historical trend (last 30 days)
        last_30_days = []
        now = timezone.now()
        for i in range(29, -1, -1):
            day = (now - timezone.timedelta(days=i)).date()
            day_str = day.strftime("%Y-%m-%d")
            # Created on this day
            created_c = wis.filter(created_at__date=day).count()
            # Completed on this day (assuming updated_at is set on completion)
            completed_c = wis.filter(
                state__slug__in=["approved", "launched_completed"], 
                updated_at__date=day
            ).count()
            last_30_days.append({
                "date": day_str,
                "created": created_c,
                "completed": completed_c
            })

        return Response(
            {
                "generated_at": timezone.now().isoformat(),
                "totals": {"all": total, "completed_or_launched": terminal, "pending": total - terminal},
                "by_state": by_state,
                "by_module": by_module,
                "by_project": by_project,
                "assignee_workload": workload,
                "historical_trend": last_30_days,
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
