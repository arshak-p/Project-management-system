from django.urls import include, path
from rest_framework.routers import DefaultRouter

from tms import views

router = DefaultRouter()
router.register(r"departments", views.DepartmentViewSet, basename="department")
router.register(r"users", views.UserViewSet, basename="user")
router.register(r"projects", views.ProjectViewSet, basename="project")
router.register(r"modules", views.ModuleViewSet, basename="module")
router.register(r"states", views.StateViewSet, basename="state")
router.register(r"labels", views.LabelViewSet, basename="label")
router.register(r"cycles", views.CycleViewSet, basename="cycle")
router.register(r"cycle-members", views.CycleMemberViewSet, basename="cyclemember")
router.register(r"work-items", views.WorkItemViewSet, basename="workitem")
router.register(r"comments", views.WorkItemCommentViewSet, basename="comment")
router.register(r"attachments", views.WorkItemAttachmentViewSet, basename="attachment")
router.register(r"time-logs", views.TimeLogViewSet, basename="timelog")
router.register(r"notifications", views.NotificationViewSet, basename="notification")
router.register(r"activity", views.ActivityLogViewSet, basename="activity")
router.register(r"project-members", views.ProjectMemberViewSet, basename="projectmember")

urlpatterns = [
    path("", include(router.urls)),
    path("analytics/summary/", views.AnalyticsSummaryView.as_view(), name="analytics-summary"),
    path(
        "analytics/cycles/<int:cycle_id>/progress/",
        views.CycleProgressView.as_view(),
        name="analytics-cycle-progress",
    ),
]
