"""Real-time notification stream per authenticated user."""
import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from tms import access


@database_sync_to_async
def _can_view_task(user, task_id: int) -> bool:
    return access.work_items_for_user(user).filter(pk=task_id).exists()


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close(code=4401)
            return
        self.group_name = f"user_{user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notify_message(self, event):
        await self.send(text_data=json.dumps({"type": "notification", "data": event["payload"]}))

class TaskConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close(code=4401)
            return
        
        self.task_id = self.scope['url_route']['kwargs']['task_id']
        if not await _can_view_task(user, self.task_id):
            await self.close(code=4403)
            return
        self.group_name = f"task_{self.task_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def task_comment(self, event):
        await self.send(text_data=json.dumps({"type": "comment", "data": event["payload"]}))
