from django.apps import AppConfig


class TmsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "tms"
    verbose_name = "Task Management"

    def ready(self) -> None:
        # Register signal handlers for activity logs and notifications.
        from tms import signals  # noqa: F401
