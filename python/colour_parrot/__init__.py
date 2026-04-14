# Celery app is loaded when Django starts so shared_task works.
from colour_parrot.celery_app import app as celery_app

__all__ = ("celery_app",)
