"""
Celery tasks (digest notifications, housekeeping).
Configure a beat schedule in production as needed.
"""
from celery import shared_task


@shared_task
def ping_celery():
    """Health check task for worker verification."""
    return "pong"
