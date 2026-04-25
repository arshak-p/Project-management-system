import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def create_admin():
    email = input("Enter Admin Email: ")
    password = input("Enter Admin Password: ")
    
    if not User.objects.filter(email=email).exists():
        User.objects.create_superuser(email=email, password=password, first_name="Admin", last_name="User")
        print(f"✅ Superuser {email} created successfully!")
    else:
        print(f"ℹ️ User {email} already exists.")

if __name__ == "__main__":
    create_admin()
