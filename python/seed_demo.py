import random
from datetime import timedelta
from django.utils import timezone
from tms.models import WorkItem, State, Project, Module, WorkItemComment, ActivityLog
from accounts.models import User

# Real-world Agency Client names
CLIENTS = [
    {"name": "Nike Middle East", "slug": "nike-me", "desc": "E-commerce expansion and social media campaign."},
    {"name": "Coca-Cola Branding", "slug": "coca-cola", "desc": "Summer refresh campaign and billboard designs."},
    {"name": "Tesla Riyadh", "slug": "tesla-ri", "desc": "Showroom opening digital countdown and SEO."},
    {"name": "Binance UAE", "slug": "binance", "desc": "Regulatory compliance landing pages and UX audit."},
]

# Real-world Tasks
TASK_TITLES = [
    "Design Instagram Grid", "SEO Keyword Research", "React Landing Page Build",
    "Final Video Edit", "Client Feedback Call", "Weekly Roadmap Prep",
    "Server Deployment", "Bug Fix: Login Loop", "Mobile App Icon Set",
    "Google Ads Optimization", "Email Newsletter Setup", "API Security Audit"
]

COMMENTS = [
    "I'm on it. Should be done by EOD.",
    "Can we change the blue to a more vibrant shade?",
    "Client just called, they love the progress!",
    "Blocked on this until I get the high-res assets.",
    "Merged the PR. Ready for testing.",
    "Meeting moved to 2 PM tomorrow."
]

def seed_demo():
    print("Populating Agency Demo Data...")
    now = timezone.now()
    users = list(User.objects.all())
    states = list(State.objects.all())
    mod = Module.objects.first()
    
    if not users or not states or not mod:
        print("Required base data missing.")
        return

    # 1. Create Projects
    for c in CLIENTS:
        proj, created = Project.objects.get_or_create(slug=c['slug'], defaults={'name': c['name'], 'description': c['desc']})
        
        # 2. Create Tasks for each project
        for i in range(5):
            title = random.choice(TASK_TITLES) + f" ({proj.name})"
            days_ago = random.randint(0, 15)
            created_at = now - timedelta(days=days_ago)
            
            wi = WorkItem.objects.create(
                project=proj,
                title=title,
                task_code=f"{proj.slug[:2].upper()}-{random.randint(100, 999)}",
                state=random.choice(states),
                module=mod,
                created_by=random.choice(users),
                assignee=random.choice(users),
            )
            # Override timestamps
            WorkItem.objects.filter(pk=wi.pk).update(created_at=created_at, updated_at=created_at + timedelta(hours=random.randint(1, 48)))

            # 3. Add Comments
            for _ in range(random.randint(1, 3)):
                WorkItemComment.objects.create(
                    work_item=wi,
                    author=random.choice(users),
                    body=random.choice(COMMENTS)
                )

            # 4. Add Activity Logs
            ActivityLog.objects.create(
                entity_type="work_item",
                entity_id=str(wi.pk),
                action="updated" if random.choice([True, False]) else "created",
                user=random.choice(users),
                project=proj,
                payload={"title": wi.title}
            )

    print("Demo Data Successfully Populated! Your agency is now 'Live' with real clients and tasks.")

seed_demo()
