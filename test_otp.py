import os
import django
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from accounts.views import send_reliable_email_async

print("Triggering test OTP email...")
send_reliable_email_async(
    subject="Test OTP Email",
    message="Your OTP is 123456",
    recipient_list=["testuser@example.com"]
)

# wait for thread to finish
time.sleep(3)
print("Done waiting.")
