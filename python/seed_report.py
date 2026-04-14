import os
import django
import random
from datetime import timedelta
from django.utils import timezone

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from accounts.models import User
from tms.models import Project, WorkItem, TimeLog, State, Module, ProjectTaskSequence

def seed_weekly_reports():
    print("Starting Professional Weekly Report Seeding...")

    # 1. Get or Create Core Members
    members = []
    member_data = [
        ("shabeel@colourparrot.local", "Shabeel", "Designer"),
        ("sinan@colourparrot.local", "Sinan", "Marketing"),
        ("khair@colourparrot.local", "Khair", "Video"),
        ("niyas@colourparrot.local", "Niyas", "AI Specialist"),
    ]
    for email, first, role_name in member_data:
        u, _ = User.objects.get_or_create(email=email, defaults={
            'username': email.split('@')[0], 'first_name': first, 'role': 'team_head'
        })
        members.append(u)

    # 2. Get or Create Premium Clients
    clients = ["Nike Performance", "Tesla Motors", "Coca-Cola Global", "Apple", "Amazon Ads"]
    projects = []
    for c_name in clients:
        p, _ = Project.objects.get_or_create(slug=c_name.lower().replace(' ', '-'), defaults={'name': c_name, 'description': f'Agency work for {c_name}'})
        ProjectTaskSequence.objects.get_or_create(project=p, defaults={'last_number': 0})
        projects.append(p)

    # 3. Get Default State and Module
    state = State.objects.filter(slug='in_progress').first() or State.objects.first()
    module = Module.objects.first()

    # 4. Generate Tasks and Time Logs for LAST 7 DAYS
    now = timezone.now()
    notes = [
        "Brand Identity Concepts", "Social Media Strategy", "Video Editing - Final Cut", 
        "Client Presentation Prep", "Research & Analytics", "UI Design Mockups",
        "SEO Optimization", "Paid Ads Campaign Setup"
    ]

    total_logs = 0
    for i in range(7): # Last 7 days
        day = now - timedelta(days=i)
        
        # Each day, 3-5 logs by different people
        for _ in range(random.randint(3, 6)):
            u = random.choice(members)
            p = random.choice(projects)
            
            # Get or create a task for this project
            task_title = f"{random.choice(notes)} - {p.name}"
            task, _ = WorkItem.objects.get_or_create(title=task_title, project=p, defaults={
                'state': state, 'module': module, 'priority': 'medium', 'created_by': u
            })
            
            # Log 1-4 hours
            mins = random.randint(60, 240)
            TimeLog.objects.create(
                user=u,
                work_item=task,
                minutes=mins,
                note=f"Completed: {random.choice(notes)}",
                logged_at=day.date()
            )
            total_logs += 1

    print("Success! Created " + str(total_logs) + " professional time logs spread over the last 7 days.")
    print("Your Weekly Report is now ready to view at /timesheets")

if __name__ == "__main__":
    seed_weekly_reports()
