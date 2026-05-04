from django.conf import settings
from django.db import models, transaction


class Department(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=64, unique=True)
    head = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="headed_departments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class JobTitle(models.Model):
    name = models.CharField(max_length=120, unique=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Project(models.Model):
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=80, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default="#6366f1")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tms_profile",
    )
    department = models.ForeignKey(
        "Department",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="user_profiles",
    )
    client_project = models.ForeignKey(
        Project,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="client_profiles",
    )

    class Meta:
        verbose_name = "User profile"
        verbose_name_plural = "User profiles"


class ProjectMember(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_memberships"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("project", "user")]


class ProjectTaskSequence(models.Model):
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name="task_sequence")
    last_number = models.PositiveIntegerField(default=0)

    def next_code(self) -> str:
        prefix = "".join(w[0] for w in self.project.slug.replace("-", " ").upper().split()[:4]) or "T"
        if len(prefix) > 6:
            prefix = prefix[:6]
        self.last_number += 1
        self.save(update_fields=["last_number"])
        return f"{prefix}-{self.last_number}"


class Module(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=64, unique=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name


class State(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=64, unique=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    color = models.CharField(max_length=7, default="#94a3b8")
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self) -> str:
        return self.name


class Label(models.Model):
    key = models.SlugField(max_length=64, unique=True)
    name = models.CharField(max_length=120)
    color_hint = models.CharField(
        max_length=32,
        blank=True,
    )
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Cycle(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="cycles")
    name = models.CharField(max_length=160)
    start_date = models.DateField()
    end_date = models.DateField()
    is_recurring = models.BooleanField(default=False)
    parent_cycle = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="child_cycles",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["-start_date", "name"]

    def __str__(self) -> str:
        return f"{self.project.slug}: {self.name}"


class CycleMember(models.Model):
    cycle = models.ForeignKey(Cycle, on_delete=models.CASCADE, related_name="cycle_members")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cycle_memberships"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("cycle", "user")]


class WorkItem(models.Model):
    class Priority(models.TextChoices):
        URGENT = "urgent", "Urgent"
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="work_items")
    task_code = models.CharField(max_length=32, db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    state = models.ForeignKey(State, on_delete=models.PROTECT, related_name="work_items")
    priority = models.CharField(
        max_length=16,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    module = models.ForeignKey(Module, on_delete=models.PROTECT, related_name="work_items")
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_work_items",
    )
    due_date = models.DateField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    posting_date = models.DateField(null=True, blank=True)
    cycle = models.ForeignKey(
        Cycle,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="work_items",
    )
    department = models.ForeignKey(
        Department,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="work_items",
    )
    scheduled_date = models.DateField(null=True, blank=True, help_text="Date when work is planned to start")
    reference_link = models.TextField(blank=True, null=True, help_text="Store multiple links separated by spaces or newlines")
    labels = models.ManyToManyField(Label, blank=True, related_name="work_items")
    board_position = models.PositiveIntegerField(
        default=0,
    )
    rework_count = models.PositiveIntegerField(default=0, help_text="Total number of times this task was sent back for revision")
    state_durations = models.JSONField(default=dict, help_text="Total minutes spent in each state: {'state_name': minutes}")
    last_state_change = models.DateTimeField(null=True, blank=True, help_text="Timestamp of the most recent state transition")
    timer_start = models.DateTimeField(null=True, blank=True, help_text="Timestamp when the last In Progress session started")
    is_client_approved = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_work_items",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["-scheduled_date", "-updated_at"]
        unique_together = [("project", "task_code")]
        indexes = [
            models.Index(fields=["project", "state"]),
            models.Index(fields=["assignee"]),
            models.Index(fields=["due_date"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.task_code} {self.title}"

    @classmethod
    def allocate_task_code(cls, project: Project) -> str:
        with transaction.atomic():
            seq, _ = ProjectTaskSequence.objects.select_for_update().get_or_create(
                project=project,
                defaults={"last_number": 0},
            )
            return seq.next_code()

    def save(self, *args, **kwargs):
        if not self.pk and not self.posting_date:
            from django.utils import timezone
            self.posting_date = timezone.now().date()
        if not self.task_code:
            self.task_code = self.allocate_task_code(self.project)
        super().save(*args, **kwargs)


class WorkItemComment(models.Model):
    work_item = models.ForeignKey(WorkItem, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="work_item_comments"
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


def attachment_upload_to(instance: "WorkItemAttachment", filename: str) -> str:
    return f"work_items/{instance.work_item_id}/{filename}"


class WorkItemAttachment(models.Model):
    work_item = models.ForeignKey(WorkItem, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to=attachment_upload_to)
    file_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=128, blank=True)
    size_bytes = models.BigIntegerField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="uploaded_attachments"
    )
    created_at = models.DateTimeField(auto_now_add=True)


class TimeLog(models.Model):
    work_item = models.ForeignKey(WorkItem, on_delete=models.CASCADE, related_name="time_logs")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="time_logs"
    )
    minutes = models.PositiveIntegerField()
    note = models.CharField(max_length=500, blank=True)
    logged_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-logged_at"]
        indexes = [
            models.Index(fields=["logged_at"]),
            models.Index(fields=["user"]),
            models.Index(fields=["work_item"]),
        ]


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ActivityLog(models.Model):
    entity_type = models.CharField(max_length=64, db_index=True)
    entity_id = models.CharField(max_length=64, db_index=True)
    action = models.CharField(max_length=64)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="activity_logs",
    )
    project = models.ForeignKey(
        Project,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="activity_logs",
    )
    payload = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_at"]),
        ]


class Backup(models.Model):
    month = models.CharField(max_length=7)  # YYYY-MM
    created_at = models.DateTimeField(auto_now_add=True)
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_backups"
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Backup {self.month}"