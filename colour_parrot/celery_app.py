"""
Celery configuration for background jobs (digests, cleanup, async notifications).
"""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "colour_parrot.settings")

app = Celery("colour_parrot")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
