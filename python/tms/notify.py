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
