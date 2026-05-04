import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from tms.models import WorkItem
from accounts.models import User

print("--- FULL TASK CENSUS ---")
tasks = WorkItem.objects.all()
print(f"Total tasks in DB: {tasks.count()}")
for w in tasks:
    assignee_str = f"{w.assignee.first_name} ({w.assignee.email})" if w.assignee else "UNASSIGNED"
    print(f"[{w.task_code}] {w.title} -> {assignee_str}")

print("\n--- USER LIST ---")
users = User.objects.all()
for u in users:
    print(f"User: {u.first_name} {u.last_name} | Email: {u.email} | ID: {u.id}")
