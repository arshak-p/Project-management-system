import os
import django
from django.core.mail import send_mail
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

print("INITIALIZING SMTP UPLINK TEST...")
print(f"HOST: {settings.EMAIL_HOST}")
print(f"USER: {settings.EMAIL_HOST_USER}")

try:
    send_mail(
        subject='SMTP RELAY TEST - COLOUR PARROT',
        message='This is a tactical test of the agency email relay system.',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[settings.EMAIL_HOST_USER], # Send to self
        fail_silently=False,
    )
    print("SUCCESS: SMTP RELAY OPERATIONAL.")
except Exception as e:
    print(f"CRITICAL SMTP ERROR: {str(e)}")
