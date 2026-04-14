from django.contrib import admin

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
    ProjectTaskSequence,
    State,
    TimeLog,
    UserProfile,
    WorkItem,
    WorkItemAttachment,
    WorkItemComment,
)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "head")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "department", "client_project")
    list_filter = ("department",)


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "sort_order")
    ordering = ("sort_order",)


@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "sort_order")
    ordering = ("sort_order",)


@admin.register(Label)
class LabelAdmin(admin.ModelAdmin):
    list_display = ("name", "key", "color_hint")


@admin.register(Cycle)
class CycleAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "start_date", "end_date", "is_recurring")


@admin.register(CycleMember)
class CycleMemberAdmin(admin.ModelAdmin):
    list_display = ("cycle", "user")


@admin.register(WorkItem)
class WorkItemAdmin(admin.ModelAdmin):
    list_display = ("task_code", "title", "project", "state", "priority", "assignee", "due_date")
    list_filter = ("project", "state", "priority", "module")
    search_fields = ("title", "task_code", "description")


@admin.register(WorkItemComment)
class WorkItemCommentAdmin(admin.ModelAdmin):
    list_display = ("work_item", "author", "created_at")


@admin.register(WorkItemAttachment)
class WorkItemAttachmentAdmin(admin.ModelAdmin):
    list_display = ("work_item", "file_name", "uploaded_by", "created_at")


@admin.register(TimeLog)
class TimeLogAdmin(admin.ModelAdmin):
    list_display = ("work_item", "user", "minutes", "logged_at")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "read", "created_at")


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "entity_type", "entity_id", "project", "user")
    list_filter = ("action", "entity_type")


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ("project", "user")


@admin.register(ProjectTaskSequence)
class ProjectTaskSequenceAdmin(admin.ModelAdmin):
    list_display = ("project", "last_number")
