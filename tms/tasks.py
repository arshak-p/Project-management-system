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
    from django.db import models
    from tms.models import WorkItem
    from tms.notify import notify_user
    
    tomorrow = date.today() + timedelta(days=1)
    
    # Find active tasks due tomorrow or today that are not completed (checks both due_date and deadline)
    upcoming = WorkItem.objects.filter(
        (models.Q(due_date__lte=tomorrow) | models.Q(deadline__lte=tomorrow)),
        is_active=True,
        assignee__isnull=False
    ).exclude(state__slug__in=['completed-launched', 'archived'])
    
    count = 0
    for task in upcoming:
        urgent_flag = "🚨 DEADLINE" if task.deadline and task.deadline <= tomorrow else "📅 Due"
        date_str = task.deadline if urgent_flag == "🚨 DEADLINE" else task.due_date
        
        notify_user(
            task.assignee.id,
            title=f"{urgent_flag} Reminder: {task.task_code}",
            body=f"Task '{task.title}' is reaching its {urgent_flag.lower()} on {date_str}. Please plan accordingly.",
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
def check_do_dates():
    """Notifies specialists and managers when a task reaches its Do Date (Start Date)."""
    from datetime import date
    from tms.models import WorkItem
    from tms.notify import notify_user, notify_roles
    from accounts.models import User
    
    today = date.today()
    starting_today = WorkItem.objects.filter(
        due_date=today,
        is_active=True,
        assignee__isnull=False
    ).exclude(state__slug__in=['completed-launched', 'archived'])
    
    count = 0
    for task in starting_today:
        # 1. Notify the Specialist (Do Date)
        notify_user(
            task.assignee.id,
            title="🚀 Do-Day! Time to start work",
            body=f"Task '{task.task_code}' is scheduled for you to START today. Good luck!",
            link=f"/task/{task.id}"
        )
        
        # 2. Notify Managers
        notify_roles(
            roles=[User.Role.PROJECT_MANAGER, User.Role.ADMIN],
            title=f"Specialist Starting Work: {task.task_code}",
            body=f"{task.assignee.get_full_name() or task.assignee.email} is starting work on '{task.title}' today.",
            link=f"/task/{task.id}"
        )
        count += 1
    return f"Notified {count} tasks reaching their Do Date today."
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
    from tms.models import Notification
    for user in birthday_users:
        existing = Notification.objects.filter(
            title=f"It's {user.first_name}'s Birthday! 🥳",
            created_at__date=today
        ).exists()
        if existing:
            continue

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
