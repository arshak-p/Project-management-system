"""Activity logging hooks and profile bootstrap."""
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from accounts.models import User
from tms.notify import notify_user

from tms.models import ActivityLog, UserProfile, WorkItem, WorkItemComment


@receiver(post_save, sender=User)
def ensure_user_profile(sender, instance: User, created: bool, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=WorkItem)
def log_work_item_save(sender, instance: WorkItem, created: bool, **kwargs):
    """Audit trail; views should set `_activity_user` on the instance before save when possible."""
    if kwargs.get("raw"):
        return
    actor = getattr(instance, "_activity_user", None)
    action = "created" if created else "updated"
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

    if not created and actor:
        # Notify assignee if they didn't make the change
        if instance.assignee and instance.assignee.id != actor.id:
            notify_user(
                instance.assignee.id,
                title=f"Task Updated: {instance.task_code}",
                body=f"{actor.first_name or actor.email} updated '{instance.title}'",
                link=f"/task/{instance.id}"
            )
        # Notify creator if they didn't make the change
        if instance.created_by and instance.created_by.id != actor.id and (not instance.assignee or instance.assignee.id != instance.created_by.id):
            notify_user(
                instance.created_by.id,
                title=f"Task Updated: {instance.task_code}",
                body=f"{actor.first_name or actor.email} updated your task '{instance.title}'",
                link=f"/task/{instance.id}"
            )

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
    # Notify task creator
    if wi.created_by and wi.created_by.id != actor.id and (not wi.assignee or wi.assignee.id != wi.created_by.id):
        notify_user(
            wi.created_by.id,
            title=f"New Comment on {wi.task_code}",
            body=f"{actor.first_name or actor.email}: {instance.body[:50]}...",
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
