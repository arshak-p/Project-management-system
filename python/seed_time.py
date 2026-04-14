import random
from datetime import timedelta
from django.utils import timezone
from accounts.models import User
from tms.models import WorkItem, TimeLog

users = list(User.objects.all()[:3])
tasks = list(WorkItem.objects.all()[:5])

if users and tasks:
    print(f"Adding test time logs to DB for users: {[u.email for u in users]}...")
    now = timezone.now()
    
    # Create logs spreading over the last 40 days
    for _ in range(50):
        days_ago = random.randint(0, 40)
        u = random.choice(users)
        t = random.choice(tasks)
        log_date = now - timedelta(days=days_ago)
        mins = random.randint(15, 180)
        
        TimeLog.objects.create(
            user=u,
            work_item=t,
            minutes=mins,
            note=f"Worked on {t.title} (Dummy data)",
            logged_at=log_date.date()
        )
    print("Successfully added 50 mock time logs spread across the last month!")
else:
    print("Not enough users or tasks to create dummy time logs.")
