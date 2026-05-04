"""Create Notification rows and push to Channels groups (user-specific)."""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from tms.models import Notification


def notify_user(user_id: int, title: str, body: str = "", link: str = "") -> Notification:
    row = Notification.objects.create(user_id=user_id, title=title, body=body, link=link)
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}",
            {
                "type": "notify.message",
                "payload": {
                    "id": row.id,
                    "title": title,
                    "body": body,
                    "link": link,
                },
            },
        )
    return row


def notify_roles(roles: list, title: str, body: str = "", link: str = "", exclude_user=None):
    """Notify all users within a list of roles."""
    from accounts.models import User
    users = User.objects.filter(role__in=roles, is_active=True)
    if exclude_user:
        users = users.exclude(id=exclude_user.id)
    for u in users:
        notify_user(u.id, title=title, body=body, link=link)
def notify_all(title: str, body: str = "", link: str = "", exclude_user_id=None):
    """Notify every active user in the system."""
    from accounts.models import User
    users = User.objects.filter(is_active=True)
    if exclude_user_id:
        users = users.exclude(id=exclude_user_id)
    for u in users:
        notify_user(u.id, title=title, body=body, link=link)
