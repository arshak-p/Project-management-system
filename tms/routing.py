from django.urls import path

from tms.consumers import NotificationConsumer, TaskConsumer, WorkspaceConsumer

websocket_urlpatterns = [
    path("ws/workspace/", WorkspaceConsumer.as_asgi()),
    path("ws/notifications/", NotificationConsumer.as_asgi()),
    path("ws/tasks/<int:task_id>/", TaskConsumer.as_asgi()),
]
