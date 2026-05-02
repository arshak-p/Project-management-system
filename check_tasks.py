import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from tms.models import WorkItem
from django.db.models import Count

print("Task Counts by Assignee:")
counts = WorkItem.objects.values('assignee__email', 'assignee__first_name').annotate(c=Count('id'))
for row in counts:
    print(f"User: {row['assignee__first_name']} ({row['assignee__email']}) -> {row['c']} tasks")

print("\nRecent Tasks for Shabeel:")
from accounts.models import User
shabeel = User.objects.filter(email='muhammedshabeel175@gmail.com').first()
if shabeel:
    tasks = WorkItem.objects.filter(assignee=shabeel).order_by('-created_at')[:5]
    for t in tasks:
        print(f"Task: {t.task_code} - {t.title} (Created: {t.created_at})")
else:
    print("User Shabeel not found.")
