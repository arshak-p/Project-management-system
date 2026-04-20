import os
import django
import random
from datetime import datetime, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from django.contrib.auth import get_user_model
from tms.models import Project, State, Module, WorkItem, Department

User = get_user_model()

def seed_data():
    print("Initializing Tactical Data Seeding Sequence...")
    
    # 1. Ensure Admin and Users
    admin, _ = User.objects.get_or_create(username='admin', defaults={'email': 'admin@colorparrot.com', 'is_superuser': True, 'is_staff': True})
    if _: admin.set_password('admin123'); admin.save()
    
    # 2. Departments & Modules
    depts = ['Production', 'Creative', 'Development', 'Marketing']
    dept_objs = []
    for d in depts:
        obj, _ = Department.objects.get_or_create(name=d, defaults={'slug': d.lower()})
        dept_objs.append(obj)
        
    modules = ['Content Design', 'Line Production', 'Back-end Dev', 'UI/UX Strategy', 'Market Research']
    module_objs = []
    for m in modules:
        obj, _ = Module.objects.get_or_create(name=m, defaults={'slug': m.lower().replace(' ', '-')})
        module_objs.append(obj)

    # 3. States (Workflow)
    states = [
        ('Backlog', 'backlog', 0),
        ('Active', 'active', 1),
        ('In Progress', 'in-progress', 2),
        ('Internal Review', 'review', 3),
        ('Launched', 'launched', 4)
    ]
    state_objs = []
    for name, slug, order in states:
        obj, _ = State.objects.get_or_create(slug=slug, defaults={'name': name, 'sort_order': order})
        state_objs.append(obj)

    # 4. Projects
    projects_data = [
        ('SkyBlue Branding', 'skyblue-branding'),
        ('Emerald E-Commerce', 'emerald-ecom'),
        ('Ruby Mobile App', 'ruby-mobile'),
        ('Obsidian Campaign', 'obsidian-camp')
    ]
    project_objs = []
    for name, slug in projects_data:
        obj, _ = Project.objects.get_or_create(slug=slug, defaults={'name': name})
        project_objs.append(obj)

    # 5. Tasks (Deploying Units)
    print("Deploying Task Units across the temporal grid...")
    today = datetime.now().date()
    
    task_titles = [
        "Phase 1 Asset Creation", "Final UI Polish", "Database Schema Optimization",
        "Social Media Content Strategy", "Competitor Analysis Report", "Deployment to Staging",
        "Client Feedback Loop", "Resource Allocation Review", "Brand Identity Guidelines",
        "API Integration Testing", "Server Load Balancing", "Keyword Research",
        "Logo Iteration #3", "Wireframe Approval", "Security Audit", "Production Line Setup"
    ]

    for i in range(30):
        title = random.choice(task_titles) + f" {random.randint(100, 999)}"
        proj = random.choice(project_objs)
        mod = random.choice(module_objs)
        state = random.choice(state_objs)
        
        # Spread dates over current month and next
        offset = random.randint(-15, 30)
        due_date = today + timedelta(days=offset)
        
        priority = random.choice(['urgent', 'high', 'medium', 'low'])
        
        WorkItem.objects.get_or_create(
            title=title,
            project=proj,
            defaults={
                'description': 'Tactical task generated for operational testing.',
                'state': state,
                'module': mod,
                'priority': priority,
                'due_date': due_date,
                'assignee': admin
            }
        )

    print("Deployment Successful. 30 Tactical Tasks generated.")

if __name__ == "__main__":
    seed_data()
