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

@shared_task
def check_scheduled_tasks():
    """Notifies PMs and Admins when a task is scheduled to start today."""
    from datetime import date
    from tms.models import WorkItem
    from tms.notify import notify_roles
    from accounts.models import User
    
    today = date.today()
    starting_today = WorkItem.objects.filter(
        scheduled_date=today,
        is_active=True
    ).exclude(state__slug__in=['completed-launched', 'archived', 'in-progress'])
    
    count = 0
    for task in starting_today:
        notify_roles(
            roles=[User.Role.PROJECT_MANAGER, User.Role.ADMIN],
            title=f"Task Start Date: {task.task_code}",
            body=f"Task '{task.title}' is scheduled to start today.",
            link=f"/task/{task.id}"
        )
        count += 1
    return f"Notified managers about {count} starting tasks."
@shared_task
def check_birthdays():
    """Scans for user birthdays today and notifies the individual and the entire team."""
    from datetime import date
    from accounts.models import User
    from tms.notify import notify_user, notify_all
    
    today = date.today()
    
    # Find users whose DOB month-day matches today
    birthday_users = User.objects.filter(
        date_of_birth__month=today.month,
        date_of_birth__day=today.day,
        is_active=True
    )
    
    count = 0
    for user in birthday_users:
        # 1. Notify the birthday person
        notify_user(
            user.id,
            title="Happy Birthday! 🎂",
            body=f"Hello {user.first_name}, the entire Colour Parrot team wishes you an incredible birthday! Enjoy your special day!",
            link="/profile"
        )
        
        # 2. Notify everyone else
        notify_all(
            title=f"It's {user.first_name}'s Birthday! 🥳",
            body=f"Today is {user.get_full_name()}'s birthday! Let's all celebrate and send our best wishes!",
            exclude_user_id=user.id
        )
        count += 1
    
    return f"Processed {count} birthdays today."
