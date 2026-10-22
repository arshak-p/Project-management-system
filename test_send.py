import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()
from accounts.views import send_reliable_email_async
import threading, time

send_reliable_email_async('Welcome', 'Hello', ['test@example.com'])
print('Sent, waiting for thread...')
time.sleep(5)
