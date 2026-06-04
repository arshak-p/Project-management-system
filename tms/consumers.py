"""Real-time notification stream per authenticated user."""
import json

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close(code=4401)
            return
        self.group_name = f"user_{user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.update_user_activity()

    async def receive_json(self, content):
        if content.get("type") == "heartbeat":
            await self.update_user_activity()

    async def update_user_activity(self):
        from channels.db import database_sync_to_async
        from django.utils import timezone
        user = self.scope["user"]

        @database_sync_to_async
        def _update():
            # Update last_active in DB
            user.__class__.objects.filter(id=user.id).update(last_active=timezone.now())

        await _update()

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
        self.group_name = f"task_{self.task_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def task_comment(self, event):
        await self.send(text_data=json.dumps({"type": "comment", "data": event["payload"]}))
