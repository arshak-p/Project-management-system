import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from accounts.models import User
from tms.access import users_for_user

from tms.models import WorkItem
print(f"Total WorkItems: {WorkItem.objects.count()}")
print(f"Active WorkItems: {WorkItem.objects.filter(is_active=True).count()}")

for u in User.objects.all():
    print(f"User: {u.email}, Role: {u.role}, Active: {u.is_active}, IsSuper: {u.is_superuser}")
    qs = users_for_user(u)
    print(f"  Visibility count: {qs.count()}")
