import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from tms.models import State

DEFAULTS = [
    ('backlog', 'Backlog', '#64748b', 0),
    ('to-do', 'To Do', '#6366f1', 10),
    ('in-progress', 'In Progress', '#3b82f6', 20),
    ('team-head-review', 'Team Head Review', '#f59e0b', 40),
    ('client-review', 'Client Review', '#8b5cf6', 50),
    ('rework-revision', 'Rework / Revision', '#ef4444', 60),
    ('completed-launched', 'Completed / Launched', '#10b981', 100),
]

def run():
    print("Starting Workflow Sync...")
    for slug, name, color, order in DEFAULTS:
        state, created = State.objects.update_or_create(
            slug=slug,
            defaults={
                'name': name,
                'color': color,
                'sort_order': order,
                'is_active': True
            }
        )
        status = "Created" if created else "Synced"
        print(f"  - [{status}] {name} ({color})")
    
    # Deactivate any other states to keep the UI clean
    valid_slugs = [d[0] for d in DEFAULTS]
    deactivated = State.objects.exclude(slug__in=valid_slugs).update(is_active=False)
    if deactivated:
        print(f"Cleaned up {deactivated} old states.")
    
    print("Workflow Sync Complete! Your dashboard is now 100% ready.")

if __name__ == "__main__":
    run()
