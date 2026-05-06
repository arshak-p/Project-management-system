import os
import django
import random
from django.core.mail import send_mail
from django.conf import settings

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from accounts.models import EmailOTP

target_email = 'Creator1colourparrot@gmail.com'
otp_code = f"{random.randint(100000, 999999)}"

print(f"DEBUG: Generating tactical clearance code for {target_email}...")
print(f"CODE: {otp_code}")

try:
    # 1. Register OTP in Database so UI can verify it
    EmailOTP.objects.create(email=target_email, otp=otp_code)
    print("SUCCESS: Code registered in Command Center database.")

    # 2. Dispatch Email
    send_mail(
        subject='Colour Parrot: Tactical Clearance Code',
        message=f'You are being recruited to the Colour Parrot Command Center. Your clearance code is: {otp_code}',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[target_email],
        fail_silently=False,
    )
    print(f"SUCCESS: Clearance code dispatched to {target_email}.")
except Exception as e:
    print(f"ERROR: Mission failure: {str(e)}")
