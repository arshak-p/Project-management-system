"""Serializers for TMS API - nested reads, validated writes, client approval rules."""
from django.db import transaction
from rest_framework import serializers

from accounts.models import User

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
    ProjectTaskSequence,
    State,
    TimeLog,
    UserProfile,
    WorkItem,
    WorkItemAttachment,
    WorkItemComment,
    Backup,
)
from tms.notify import notify_user

_UNSET = object()


class DepartmentSerializer(serializers.ModelSerializer):
    head_id = serializers.PrimaryKeyRelatedField(
        source="head",
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Department
        fields = ("id", "name", "slug", "head_id", "created_at", "is_active")


class JobTitleSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobTitle
        fields = ("id", "name", "is_active", "created_at")

    def create(self, validated_data):
        u = validated_data.pop('_activity_user', None)
        instance = JobTitle(**validated_data)
        if u: instance._activity_user = u
        instance.save()
        return instance

    def update(self, instance, validated_data):
        u = validated_data.pop('_activity_user', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if u: instance._activity_user = u
        instance.save()
        return instance


class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role", "title")


class UserSerializer(serializers.ModelSerializer):
    department_id = serializers.IntegerField(allow_null=True, required=False)
    client_project_id = serializers.IntegerField(allow_null=True, required=False)
    efficiency = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
            "role",
            "title",
            "phone",
            "avatar",
            "department_id",
            "client_project_id",
            "is_active",
            "date_joined",
            "date_of_birth",
            "efficiency",
            "last_active",
        )
        read_only_fields = ("id",)
        extra_kwargs = {"password": {"write_only": True, "required": False, "allow_blank": True}}

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        if value:
            validate_password(value)
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user:
            user = request.user
            is_hr_or_admin = (
                user.is_superuser
                or user.role in [User.Role.ADMIN, User.Role.PROJECT_MANAGER, User.Role.HR]
            )
            if not is_hr_or_admin and self.instance and self.instance.id == user.id:
                restricted_fields = {
                    "role": "role",
                    "is_active": "account status",
                    "email": "email address",
                    "username": "username",
                    "date_joined": "date joined",
                    "department_id": "department",
                    "client_project_id": "client project association",
                }
                for field, label in restricted_fields.items():
                    if field in attrs:
                        if field == "department_id":
                            prof = getattr(self.instance, "tms_profile", None)
                            current_val = prof.department_id if prof else None
                        elif field == "client_project_id":
                            prof = getattr(self.instance, "tms_profile", None)
                            current_val = prof.client_project_id if prof else None
                        else:
                            current_val = getattr(self.instance, field, None)
                        
                        if attrs[field] != current_val:
                            raise serializers.ValidationError({
                                field: f"You do not have permission to change your {label}."
                            })
        return attrs

    def get_efficiency(self, obj):
        # Optimized: Use annotated values from the queryset if available
        total_time = getattr(obj, 'total_minutes_logged', None)
        completed = getattr(obj, 'completed_tasks_count', None)
        
        if total_time is None or completed is None:
            from django.db.models import Sum
            wis = obj.assigned_work_items.all()
            total_time = TimeLog.objects.filter(work_item__in=wis).aggregate(total=Sum('minutes'))['total'] or 0
            completed = wis.filter(state__slug__in=['completed-launched', 'completed', 'launched', 'done']).count()
        
        if total_time > 0:
            return min(100, int((completed * 90) / total_time * 100))
        elif completed > 0:
            return 100
        return 0

    def to_representation(self, instance):
        data = super().to_representation(instance)
        prof = getattr(instance, "tms_profile", None)
        data["department_id"] = prof.department_id if prof else None
        data["client_project_id"] = prof.client_project_id if prof else None
        return data

    def update(self, instance, validated_data):
        u_actor = validated_data.pop("_activity_user", None)
        password = validated_data.pop("password", None)
        dept_id = validated_data.pop("department_id", _UNSET)
        cp_id = validated_data.pop("client_project_id", _UNSET)
        
        # Backend Safety Net: Convert empty strings to None for date fields
        if "date_of_birth" in validated_data and validated_data["date_of_birth"] == "":
            validated_data["date_of_birth"] = None
        if "date_joined" in validated_data and validated_data["date_joined"] == "":
            validated_data["date_joined"] = None
        
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        
        if password:
            instance.set_password(password)
            
        if u_actor: instance._activity_user = u_actor
        instance.save()
        if dept_id is not _UNSET or cp_id is not _UNSET:
            prof, _ = UserProfile.objects.get_or_create(user=instance)
            if dept_id is not _UNSET:
                prof.department_id = dept_id
            if cp_id is not _UNSET:
                prof.client_project_id = cp_id
            prof.save()
        return instance


class ProjectSerializer(serializers.ModelSerializer):
    total_minutes = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Project
        fields = ("id", "name", "slug", "description", "color", "created_at", "updated_at", "is_active", "total_minutes")

    def create(self, validated_data):
        u = validated_data.pop('_activity_user', None)
        instance = Project(**validated_data)
        if u: instance._activity_user = u
        instance.save()
        return instance

    def update(self, instance, validated_data):
        u = validated_data.pop('_activity_user', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if u: instance._activity_user = u
        instance.save()
        return instance


class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ("id", "name", "slug", "sort_order", "is_active")


class StateSerializer(serializers.ModelSerializer):
    class Meta:
        model = State
        fields = ("id", "name", "slug", "color", "sort_order", "is_active")


class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ("id", "key", "name", "color_hint", "is_active")


class CycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cycle
        fields = (
            "id",
            "project",
            "name",
            "start_date",
            "end_date",
            "is_recurring",
            "parent_cycle",
            "created_at",
            "updated_at",
            "is_active",
        )


class CycleMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = CycleMember
        fields = ("id", "cycle", "user", "created_at")


class WorkItemCommentSerializer(serializers.ModelSerializer):
    author = UserBriefSerializer(read_only=True)

    class Meta:
        model = WorkItemComment
        fields = ("id", "work_item", "author", "body", "created_at")
        read_only_fields = ("author",)

    def create(self, validated_data):
        request = self.context["request"]
        return WorkItemComment.objects.create(author=request.user, **validated_data)


class WorkItemAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserBriefSerializer(read_only=True)
    file = serializers.FileField(write_only=False)

    class Meta:
        model = WorkItemAttachment
        fields = (
            "id",
            "work_item",
            "file",
            "file_name",
            "mime_type",
            "size_bytes",
            "uploaded_by",
            "created_at",
        )
        read_only_fields = ("file_name", "mime_type", "size_bytes", "uploaded_by")

    def create(self, validated_data):
        request = self.context["request"]
        f = validated_data["file"]
        validated_data["file_name"] = getattr(f, "name", "upload")
        validated_data["mime_type"] = getattr(f, "content_type", "") or ""
        validated_data["size_bytes"] = getattr(f, "size", None)
        validated_data["uploaded_by"] = request.user
        return super().create(validated_data)


class TimeLogSerializer(serializers.ModelSerializer):
    user = UserBriefSerializer(read_only=True)

    class Meta:
        model = TimeLog
        fields = ("id", "work_item", "user", "minutes", "note", "logged_at", "created_at")
        read_only_fields = ("user",)

    def create(self, validated_data):
        request = self.context["request"]
        return TimeLog.objects.create(user=request.user, **validated_data)


class WorkItemSerializer(serializers.ModelSerializer):
    labels = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Label.objects.all(), required=False
    )
    assignee = UserBriefSerializer(read_only=True)
    assignee_id = serializers.PrimaryKeyRelatedField(
        source="assignee",
        queryset=User.objects.all(),
        allow_null=True,
        write_only=True,
        required=False,
    )
    content_writer = UserBriefSerializer(read_only=True)
    content_writer_id = serializers.PrimaryKeyRelatedField(
        source="content_writer",
        queryset=User.objects.all(),
        allow_null=True,
        write_only=True,
        required=False,
    )
    state_slug = serializers.SlugField(source="state.slug", read_only=True)
    state__name = serializers.CharField(source="state.name", read_only=True)
    project__slug = serializers.SlugField(source="project.slug", read_only=True)
    module_slug = serializers.SlugField(source="module.slug", read_only=True)
    label_details = LabelSerializer(source="labels", many=True, read_only=True)
    total_minutes = serializers.SerializerMethodField()

    class Meta:
        model = WorkItem
        fields = (
            "id",
            "project",
            "task_code",
            "title",
            "description",
            "state",
            "state_slug",
            "state__name",
            "project__slug",
            "priority",
            "module",
            "module_slug",
            "assignee",
            "assignee_id",
            "content_writer",
            "content_writer_id",
            "posting_date",
            "due_date",
            "deadline",
            "scheduled_date",
            "timer_start",
            "reference_link",
            "cycle",
            "department",
            "labels",
            "label_details",
            "board_position",
            "created_by",
            "created_at",
            "updated_at",
            "is_active",
            "is_client_approved",
            "total_minutes",
        )
        read_only_fields = ("task_code", "created_by", "created_at", "updated_at", "total_minutes")

    def get_total_minutes(self, obj):
        return sum(log.minutes for log in obj.time_logs.all())

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        
        # Admin, PM and Team Heads have management control
        if user.role in [User.Role.ADMIN, User.Role.PROJECT_MANAGER, User.Role.TEAM_HEAD]:
            return attrs

        state = attrs.get("state")
        if state and "state" in attrs:
            # Client Restrictions
            if user.role == User.Role.CLIENT:
                if state.slug not in ["client-review", "completed-launched"]:
                    raise serializers.ValidationError("Clients may only move tasks to 'Client Review' or 'Completed'.")
            
            # Specialist Restrictions
            if user.role == User.Role.SPECIALIST:
                if state.slug not in ["pending", "in-progress", "team-head-review"]:
                    raise serializers.ValidationError(
                        "Specialists are permitted to move tasks between 'Pending', 'In Progress', and 'Team Head Review'. Final approval to Client Review or Completed requires a Manager."
                    )
        
        return attrs

    def update(self, instance, validated_data):
        request = self.context["request"]
        user = request.user
        labels = validated_data.pop("labels", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance._activity_user = user
        instance.save()
        if labels is not None:
            instance.labels.set(labels)
        return instance

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        u_actor = validated_data.pop("_activity_user", request.user)
        labels = validated_data.pop("labels", [])
        project = validated_data["project"]
        seq, _ = ProjectTaskSequence.objects.select_for_update().get_or_create(
            project=project,
            defaults={"last_number": 0},
        )
        code = seq.next_code()
        wi = WorkItem(task_code=code, created_by=request.user, **validated_data)
        wi._activity_user = u_actor
        wi.save()
        if labels:
            wi.labels.set(labels)

        if wi.assignee_id:
            notify_user(
                wi.assignee_id,
                f"Assigned: {wi.task_code}",
                wi.title,
                link=f"/projects/{project.slug}/tasks/{wi.pk}",
            )
        return wi


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "title", "body", "read", "link", "created_at")


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = (
            "id",
            "entity_type",
            "entity_id",
            "action",
            "user",
            "project",
            "payload",
            "created_at",
        )


class ProjectMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMember
        fields = ("id", "project", "user", "created_at")


class BackupSerializer(serializers.ModelSerializer):
    approved_by_details = UserBriefSerializer(source="approved_by", read_only=True)

    class Meta:
        model = Backup
        fields = (
            "id",
            "month",
            "created_at",
            "is_approved",
            "approved_by",
            "approved_by_details",
            "approved_at"
        )
        read_only_fields = ("created_at", "approved_by", "approved_at", "is_approved")
