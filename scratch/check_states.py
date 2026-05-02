import os
import sys
import django

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from tms.models import State
states = State.objects.all()
for s in states:
    print(f"NAME: {s.name} | SLUG: {s.slug}")
