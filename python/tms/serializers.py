"""Serializers for TMS API — nested reads, validated writes, client approval rules."""
from django.db import transaction
from rest_framework import serializers

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
    ProjectTaskSequence,
    State,
    TimeLog,
    UserProfile,
    WorkItem,
    WorkItemAttachment,
    WorkItemComment,
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
        fields = ("id", "name", "slug", "head_id", "created_at")


class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role", "title")


class UserSerializer(serializers.ModelSerializer):
    department_id = serializers.IntegerField(allow_null=True, required=False)
    client_project_id = serializers.IntegerField(allow_null=True, required=False)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "title",
            "phone",
            "avatar",
            "department_id",
            "client_project_id",
            "is_active",
        )
        read_only_fields = ("id",)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        prof = getattr(instance, "tms_profile", None)
        data["department_id"] = prof.department_id if prof else None
        data["client_project_id"] = prof.client_project_id if prof else None
        return data

    def update(self, instance, validated_data):
        dept_id = validated_data.pop("department_id", _UNSET)
        cp_id = validated_data.pop("client_project_id", _UNSET)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
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
    class Meta:
        model = Project
        fields = ("id", "name", "slug", "description", "created_at", "updated_at")


class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ("id", "name", "slug", "sort_order")


class StateSerializer(serializers.ModelSerializer):
    class Meta:
        model = State
        fields = ("id", "name", "slug", "sort_order")


class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ("id", "key", "name", "color_hint")


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
    state_slug = serializers.SlugField(source="state.slug", read_only=True)
    module_slug = serializers.SlugField(source="module.slug", read_only=True)
    label_details = LabelSerializer(source="labels", many=True, read_only=True)

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
            "priority",
            "module",
            "module_slug",
            "assignee",
            "assignee_id",
            "due_date",
            "cycle",
            "department",
            "labels",
            "label_details",
            "board_position",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("task_code", "created_by", "created_at", "updated_at")

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        instance: WorkItem | None = self.instance
        if user.role != User.Role.CLIENT:
            return attrs
        if not instance:
            raise serializers.ValidationError("Clients cannot create tasks via this API.")
        state = attrs.get("state", instance.state)
        if "state" in attrs and state.slug not in (
            "client_review",
            "approved",
            "launched_completed",
        ):
            raise serializers.ValidationError(
                "Clients may only work with client review, approved, or launched states."
            )
        return attrs

    def update(self, instance, validated_data):
        request = self.context["request"]
        user = request.user
        new_state = validated_data.get("state", instance.state)
        old_state = instance.state
        if user.role == User.Role.CLIENT:
            allowed = {"state", "description"}
            extra = set(validated_data.keys()) - allowed
            if extra:
                raise serializers.ValidationError("Clients may only update status and notes.")
            if new_state and old_state.slug == "client_review":
                if new_state.slug not in ("approved", "client_review"):
                    raise serializers.ValidationError(
                        "From client review, move only to approved or keep in review."
                    )
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
        labels = validated_data.pop("labels", [])
        project = validated_data["project"]
        seq, _ = ProjectTaskSequence.objects.select_for_update().get_or_create(
            project=project,
            defaults={"last_number": 0},
        )
        code = seq.next_code()
        wi = WorkItem(task_code=code, created_by=request.user, **validated_data)
        wi._activity_user = request.user
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
