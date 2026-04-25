import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def create_admin():
    email = os.environ.get('ADMIN_EMAIL')
    password = os.environ.get('ADMIN_PASSWORD')
    
    if not email or not password:
        print("❌ Error: ADMIN_EMAIL or ADMIN_PASSWORD not set in Environment Variables.")
        return

    if not User.objects.filter(email=email).exists():
        # Use email as username since it's required but email is the main login field
        User.objects.create_superuser(username=email, email=email, password=password, first_name="Admin", last_name="User")
        print(f"✅ Superuser {email} created successfully!")
    else:
        print(f"ℹ️ User {email} already exists.")

if __name__ == "__main__":
    create_admin()
