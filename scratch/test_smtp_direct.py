import os
import django
from django.core.mail import send_mail
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

def test_smtp():
    print("Initializing SMTP Test...")
    print(f"Host: {settings.EMAIL_HOST}")
    print(f"User: {settings.EMAIL_HOST_USER}")
    
    try:
        sent = send_mail(
            subject='DUMMY TEST: Local Machine Check',
            message='This is a direct test of the SMTP configuration from the local development environment.',
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=['Creator1colourparrot@gmail.com'],
            fail_silently=False,
        )
        print(f"Success! Emails sent: {sent}")
    except Exception as e:
        print(f"FAILED to send email: {str(e)}")

if __name__ == "__main__":
    test_smtp()
