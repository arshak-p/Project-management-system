import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from accounts.models import User
from tms.access import users_for_user

for u in User.objects.all():
    print(f"User: {u.email}, Role: {u.role}, Active: {u.is_active}, IsSuper: {u.is_superuser}")
    qs = users_for_user(u)
    print(f"  Visibility count: {qs.count()}")
