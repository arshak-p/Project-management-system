from django.apps import AppConfig
from django.db.models.signals import post_migrate

def seed_system_states(sender, **kwargs):
    """Ensures essential workflow states exist after migration."""
    from tms.models import State
    
    DEFAULTS = [
        ('backlog', 'Pending', '#64748b', 0),
        ('to-do', 'To Do', '#6366f1', 10),
        ('in-progress', 'In Progress', '#3b82f6', 20),
        ('team-head-review', 'Team Head Review', '#f59e0b', 40),
        ('client-review', 'Client Review', '#8b5cf6', 50),
        ('rework-revision', 'Rework / Revision', '#ef4444', 60),
        ('completed-launched', 'Completed / Launched', '#10b981', 100),
    ]
    
    for slug, name, color, order in DEFAULTS:
        State.objects.get_or_create(
            slug=slug,
            defaults={
                'name': name,
                'color': color,
                'sort_order': order,
                'is_active': True
            }
        )

class TmsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tms'

    def ready(self):
        import tms.signals  # Ensure signals are registered
        # Use post_migrate to ensure states exist
        post_migrate.connect(seed_system_states, sender=self)
