import random
from datetime import timedelta
from django.utils import timezone
from tms.models import WorkItem, State, Project, Module
from accounts.models import User

# Get dependencies
it_proj = Project.objects.filter(slug='it-infrastructure').first() or Project.objects.first()
marketing_proj = Project.objects.filter(slug='marketing-campaign').first() or Project.objects.first()
dev_mod = Module.objects.first()
states = list(State.objects.all())
users = list(User.objects.all())

if not it_proj or not dev_mod or not states:
    print("Missing base data (projects, modules, or states). Please seed those first.")
else:
    print("Generating 30 days of task history for the Line Graph...")
    now = timezone.now()
    
    # Create ~100 tasks spread over 30 days
    for i in range(100):
        days_ago = random.randint(0, 30)
        created_date = now - timedelta(days=days_ago)
        
        # Pick project
        proj = random.choice([it_proj, marketing_proj])
        
        # Create task
        wi = WorkItem.objects.create(
            project=proj,
            title=f"Historical Task {i+1}",
            task_code=f"HT-{random.randint(1000,9999)}-{i}",
            state=random.choice(states),
            module=dev_mod,
            created_by=random.choice(users) if users else None,
            assignee=random.choice(users) if users else None,
        )
        
        # Manually force created_at and updated_at in DB
        # If task is "completed" or "approved", set updated_at to a bit after creation
        is_done = wi.state.slug in ["approved", "launched_completed"]
        updated_date = created_date + timedelta(days=random.randint(1, 5)) if is_done else now
        
        WorkItem.objects.filter(pk=wi.pk).update(created_at=created_date, updated_at=updated_date)

    print("Success! Created 100 historical tasks with various timestamps for the Trend Graph.")
