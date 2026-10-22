import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from tms.models import State

DEFAULTS = [
    ('backlog', 'Pending', '#64748b', 0),
    ('in-progress', 'In Progress', '#3b82f6', 20),
    ('client-review', 'Client Review', '#8b5cf6', 50),
    ('rework-revision', 'Rework / Revision', '#ef4444', 60),
    ('completed-launched', 'Completed / Launched', '#10b981', 100),
]

def run():
    print("Starting Workflow Sync...")
    for slug, name, color, order in DEFAULTS:
        # Only create stages that are missing; never overwrite names, colours or archived flags
        # that an admin changed in Settings.
        state, created = State.objects.get_or_create(
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
    
    # Stages created by admins in Settings are left alone (they used to be deactivated on every deploy).
    
    print("Workflow Sync Complete! Your dashboard is now 100% ready.")

if __name__ == "__main__":
    run()
