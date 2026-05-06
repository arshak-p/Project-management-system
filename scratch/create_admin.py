"""
Non-interactive superuser creation for Render (no shell access).
Uses ADMIN_EMAIL and ADMIN_PASSWORD from environment variables.
Wrapped in try/except so it NEVER crashes the deployment.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()


def create_admin():
    try:
        email = os.environ.get('ADMIN_EMAIL')
        password = os.environ.get('ADMIN_PASSWORD')

        if not email or not password:
            print("⚠️ ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin creation.")
            return

        # Check if user exists by email OR username
        if User.objects.filter(email=email).exists():
            # Make sure the existing user is a superuser
            user = User.objects.get(email=email)
            if not user.is_superuser:
                user.is_superuser = True
                user.is_staff = True
                user.role = 'admin'
                user.save()
                print(f"✅ Upgraded {email} to superuser.")
            else:
                print(f"ℹ️ Superuser {email} already exists. All good.")
            return

        # Generate a safe username from email (take part before @)
        username = email.split('@')[0].lower().replace('.', '_')

        # Make sure username is unique
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1

        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            first_name="Admin",
            last_name="User",
            role="admin",
        )
        print(f"✅ Superuser {email} (username: {username}) created successfully!")

    except Exception as e:
        # NEVER crash the deployment — log the error and continue
        print(f"⚠️ Admin creation skipped due to error: {e}")
        print("   The server will still start normally.")


if __name__ == "__main__":
    create_admin()
