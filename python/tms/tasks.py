"""
Celery tasks (digest notifications, housekeeping).
Configure a beat schedule in production as needed.
"""
from celery import shared_task


@shared_task
def ping_celery():
    """Health check task for worker verification."""
    return "pong"
@shared_task
def check_deadlines():
    """Scans for tasks due in the next 24-48 hours and notifies assignees."""
    from datetime import date, timedelta
    from tms.models import WorkItem
    from tms.notify import notify_user
    
    tomorrow = date.today() + timedelta(days=1)
    
    # Find active tasks due tomorrow or today that are not completed (simple filter)
    upcoming = WorkItem.objects.filter(
        due_date__lte=tomorrow,
        is_active=True,
        assignee__isnull=False
    ).exclude(state__slug__in=['completed-launched', 'archived'])
    
    count = 0
    for task in upcoming:
        notify_user(
            task.assignee.id,
            title=f"Deadline Reminder: {task.task_code}",
            body=f"Task '{task.title}' is due on {task.due_date}. Please plan accordingly.",
            link=f"/task/{task.id}"
        )
        count += 1
    return f"Notified {count} users about upcoming deadlines."

@shared_task
def run_monthly_backup_task():
    """Trigger the management command for monthly backups."""
    from django.core.management import call_command
    call_command('run_monthly_backup')
    return "Monthly backup triggered successfully."
