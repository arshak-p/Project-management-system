"""Activity logging hooks and profile bootstrap."""
from django.conf import settings
from django.db import models
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from django.utils import timezone
from asgiref.sync import async_to_sync

from accounts.models import User
from tms.notify import notify_user, notify_roles

from tms.models import ActivityLog, UserProfile, WorkItem, WorkItemComment, Project, Department, Cycle, State, TimeLog


@receiver(post_save, sender=User)
def handle_user_save(sender, instance: User, created: bool, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)
    
    # Notify PMs and Admins about new users or profile updates
    actor = getattr(instance, "_activity_user", None)
    title = "New Team Member" if created else "Profile Updated"
    body = f"{instance.get_full_name() or instance.email} ({instance.role.replace('_', ' ').capitalize()})"
    if not created:
        body = f"Profile updated for {instance.get_full_name() or instance.email}"

    notify_roles(
        [User.Role.ADMIN, User.Role.PROJECT_MANAGER],
        title=title,
        body=body,
        link="/team",
        exclude_user=actor # Don't notify the person who made the change
    )


@receiver(pre_save, sender=WorkItem)
def track_work_item_state(sender, instance: WorkItem, **kwargs):
    if instance.pk:
        try:
            old_inst = WorkItem.objects.get(pk=instance.pk)
            instance._old_state_id = old_inst.state_id
            instance._old_assignee_id = old_inst.assignee_id
        except WorkItem.DoesNotExist:
            instance._old_state_id = None
            instance._old_assignee_id = None
    else:
        instance._old_state_id = None
        instance._old_assignee_id = None


@receiver(post_save, sender=WorkItem)
def log_work_item_save(sender, instance: WorkItem, created: bool, **kwargs):
    """Audit trail; views should set `_activity_user` on the instance before save when possible."""
    if kwargs.get("raw"):
        return
    actor = getattr(instance, "_activity_user", None)
    action = "created" if created else ("deactivated" if not instance.is_active else "updated")
    ActivityLog.objects.create(
        entity_type="work_item",
        entity_id=str(instance.pk),
        action=action,
        user=actor,
        project=instance.project,
        payload={
            "task_code": instance.task_code,
            "title": instance.title,
            "state_id": instance.state_id,
        },
    )

    # --- Assignment Notification ---
    if instance.assignee and (created or getattr(instance, "_old_assignee_id", None) != instance.assignee.id):
        if not actor or actor.id != instance.assignee.id:
            notify_user(
                instance.assignee.id,
                title=f"Task Assigned: {instance.task_code}",
                body=f"You have been assigned to task: '{instance.title}'",
                link=f"/task/{instance.id}"
            )

    if not created and actor:
        # Determine notification title and body
        is_deactivated = action == "deactivated"
        notif_title = f"Archived: {instance.task_code}" if is_deactivated else f"Task Updated: {instance.task_code}"
        notif_body = f"{actor.first_name or actor.email} archived '{instance.title}'" if is_deactivated else f"{actor.first_name or actor.email} updated '{instance.title}'"

        # Notify assignee if they didn't make the change
        if instance.assignee and instance.assignee.id != actor.id:
            notify_user(
                instance.assignee.id,
                title=notif_title,
                body=notif_body,
                link=f"/task/{instance.id}"
            )
        # Notify creator if they didn't make the change
        if instance.created_by and instance.created_by.id != actor.id and (not instance.assignee or instance.assignee.id != instance.created_by.id):
            notify_user(
                instance.created_by.id,
                title=notif_title,
                body=notif_body,
                link=f"/task/{instance.id}"
            )

    # --- Workflow Specific Notifications ---
    if not created and actor and instance.state:
        old_state_id = getattr(instance, "_old_state_id", None)
        if old_state_id != instance.state.id:
            slug = instance.state.slug
            
            # 1. Notify Team Heads for Review
            if slug == 'team-head-review':
                notify_roles(
                    [User.Role.TEAM_HEAD, User.Role.PROJECT_MANAGER],
                    title="Review Required",
                    body=f"Task {instance.task_code} is ready for internal review.",
                    link=f"/task/{instance.id}",
                    exclude_user=actor
                )
            
            # 2. Notify PMs for Client Review
            elif slug == 'client-review':
                notify_roles(
                    [User.Role.PROJECT_MANAGER, User.Role.ADMIN],
                    title="Ready for Client",
                    body=f"Task {instance.task_code} is ready for client review (Purple Phase).",
                    link=f"/task/{instance.id}",
                    exclude_user=actor
                )

            # 3. Notify Completion
            elif slug == 'completed-launched':
                 notify_user(
                    instance.created_by.id if instance.created_by else instance.assignee.id,
                    title="Project Launched! 🚀",
                    body=f"Task {instance.task_code} has been officially launched.",
                    link=f"/task/{instance.id}"
                )

    # --- Client Approval Success Notification ---
    if not created and actor and instance.is_client_approved:
        # Check if it was just approved
        # Note: In a production app we'd track the old boolean value, but for now we notify on save if true
        if instance.assignee and actor.id != instance.assignee.id:
            notify_user(
                instance.assignee.id,
                title="Client Approved! ✅",
                body=f"Great job! The client has approved '{instance.title}'.",
                link=f"/task/{instance.id}"
            )

        # Notify Managers on "Important" updates
        is_important = instance.priority in [WorkItem.Priority.URGENT, WorkItem.Priority.HIGH]
        if is_important:
            notify_roles(
                [User.Role.PROJECT_MANAGER, User.Role.ADMIN],
                title=f"CRITICAL Task Update: {instance.task_code}",
                body=f"Important task '{instance.title}' was updated by {actor.get_full_name() or actor.email}",
                link=f"/task/{instance.id}",
                exclude_user=actor
            )

        # Notify Admins if a Project Manager makes a change
        if actor.role == User.Role.PROJECT_MANAGER:
            notify_roles(
                [User.Role.ADMIN],
                title=f"PM Action: {instance.task_code}",
                body=f"Project Manager {actor.get_full_name() or actor.email} {action} task '{instance.title}'",
                link=f"/task/{instance.id}",
                exclude_user=actor
            )

        # Workflow Automation Notifications
        if instance.state and getattr(instance, "_old_state_id", None) != instance.state_id:
            if instance.state.slug == "team-head-review":
                # Notify Department Head
                if instance.department and instance.department.head:
                    notify_user(
                        instance.department.head.id,
                        title=f"Review Required: {instance.task_code}",
                        body=f"Task '{instance.title}' is ready for internal review.",
                        link=f"/task/{instance.id}"
                    )
                # Notify PMs
                notify_roles(
                    [User.Role.PROJECT_MANAGER],
                    title=f"Head Review Pending: {instance.task_code}",
                    body=f"Task '{instance.title}' submitted to Head for review.",
                    link=f"/task/{instance.id}"
                )
            elif instance.state.slug == "client-review":
                 notify_roles(
                    [User.Role.PROJECT_MANAGER, User.Role.ADMIN],
                    title=f"Client Review Ready: {instance.task_code}",
                    body=f"Task '{instance.title}' is ready for client presentation.",
                    link=f"/task/{instance.id}"
                )
            elif instance.state.slug == "completed-launched":
                 if instance.assignee:
                     notify_user(
                         instance.assignee.id,
                         title="Task Launched! 🚀",
                         body=f"Your task '{instance.title}' has been approved and completed.",
                         link=f"/task/{instance.id}"
                     )
            elif instance.state.slug == "re-edit":
                 if instance.assignee:
                     notify_user(
                         instance.assignee.id,
                         title="Re-work Required ⚠️",
                         body=f"Task '{instance.title}' has been sent back for re-editing.",
                         link=f"/task/{instance.id}"
                     )

            # --- Automated Timer Logic ---
            if instance.state.slug == "in-progress":
                # Start timer if not already running
                if not instance.timer_start:
                    WorkItem.objects.filter(pk=instance.pk).update(timer_start=timezone.now())
            
            # Check if we just LEFT in-progress
            if getattr(instance, "_old_state_id", None):
                try:
                    old_state = State.objects.get(pk=instance._old_state_id)
                    if old_state.slug == "in-progress" and instance.timer_start:
                        # Calculate duration
                        duration = timezone.now() - instance.timer_start
                        minutes = int(duration.total_seconds() // 60)
                        
                        # Only log if at least 1 minute passed
                        if minutes > 0:
                            TimeLog.objects.create(
                                work_item=instance,
                                user=actor or instance.assignee or instance.created_by,
                                minutes=minutes,
                                note="Automated session",
                                logged_at=timezone.now()
                            )
                        
                        # Reset timer
                        WorkItem.objects.filter(pk=instance.pk).update(timer_start=None)
                except State.DoesNotExist:
                    pass

@receiver(post_save, sender=WorkItemComment)
def log_comment_save(sender, instance: WorkItemComment, created: bool, **kwargs):
    if not created: return
    actor = instance.author
    wi = instance.work_item
    
    # Notify Assignee
    if wi.assignee and wi.assignee.id != actor.id:
        notify_user(
            wi.assignee.id,
            title=f"New Comment on {wi.task_code}",
            body=f"{actor.first_name or actor.email}: {instance.body[:50]}...",
            link=f"/task/{wi.id}"
        )

    # --- Mentions Support ---
    import re
    mentions = re.findall(r'@(\S+)', instance.body)
    if mentions:
        for m in set(mentions):
            # Try matching by email or first_name (case-insensitive)
            target = User.objects.filter(
                models.Q(email__iexact=m) | models.Q(first_name__iexact=m)
            ).first()
            if target and target.id != actor.id:
                notify_user(
                    target.id,
                    title=f"You were mentioned: {wi.task_code}",
                    body=f"{actor.first_name or actor.email} mentioned you: {instance.body[:50]}...",
                    link=f"/task/{wi.id}"
                )

    # Real-time WebSockets push for WhatsApp-like live comments
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"task_{wi.id}",
            {
                "type": "task.comment",
                "payload": {
                    "id": instance.id,
                    "body": instance.body,
                    "created_at": instance.created_at.isoformat(),
                    "author": {
                        "id": actor.id,
                        "first_name": actor.first_name,
                        "email": actor.email,
                    }
                }
            }
        )

@receiver(post_save, sender=Project)
def log_project_save(sender, instance: Project, created: bool, **kwargs):
    if kwargs.get("raw"): return
    actor = getattr(instance, "_activity_user", None)
    action = "created" if created else ("deactivated" if not instance.is_active else "updated")
    ActivityLog.objects.create(
        entity_type="project",
        entity_id=str(instance.pk),
        action=action,
        user=actor,
        project=instance,
        payload={"name": instance.name, "slug": instance.slug}
    )

    if actor and actor.role == User.Role.PROJECT_MANAGER:
        notify_roles(
            [User.Role.ADMIN],
            title=f"PM Project Action: {instance.name}",
            body=f"Project Manager {actor.get_full_name() or actor.email} {action} project '{instance.name}'",
            link="/projects",
            exclude_user=actor
        )

@receiver(post_save, sender=Department)
def log_department_save(sender, instance: Department, created: bool, **kwargs):
    if kwargs.get("raw"): return
    actor = getattr(instance, "_activity_user", None)
    action = "created" if created else ("deactivated" if not instance.is_active else "updated")
    ActivityLog.objects.create(
        entity_type="department",
        entity_id=str(instance.pk),
        action=action,
        user=actor,
        payload={"name": instance.name}
    )

@receiver(post_save, sender=Cycle)
def log_cycle_save(sender, instance: Cycle, created: bool, **kwargs):
    if kwargs.get("raw"): return
    actor = getattr(instance, "_activity_user", None)
    action = "created" if created else ("deactivated" if not instance.is_active else "updated")
    ActivityLog.objects.create(
        entity_type="cycle",
        entity_id=str(instance.pk),
        action=action,
        user=actor,
        project=instance.project,
        payload={"name": instance.name, "start_date": str(instance.start_date)}
    )
