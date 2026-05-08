import os
import django
from django.core.mail import send_mail
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

def test_smtp():
    print("Initializing NEW SMTP Test...")
    # Manually override to test the new code
    new_pass = "tyrf jbye nlvd yxum"
    
    try:
        sent = send_mail(
            subject='DUMMY TEST: New App Password Check',
            message=f'This is a test of the NEW App Password: {new_pass}',
            from_email="workflowsecuritycolourparrot@gmail.com",
            recipient_list=['Creator1colourparrot@gmail.com'],
            fail_silently=False,
            auth_user="workflowsecuritycolourparrot@gmail.com",
            auth_password=new_pass,
        )
        print(f"Success! Emails sent with NEW code: {sent}")
    except Exception as e:
        print(f"FAILED to send email with NEW code: {str(e)}")

if __name__ == "__main__":
    test_smtp()
