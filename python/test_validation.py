import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from tms.serializers import UserSerializer

data = {
    "first_name": "Abhijith",
    "last_name": "PS",
    "email": "abijithpsa@gmail.com",
    "password": "",
    "role": "team_head",
    "title": "Graphic Designer",
    "phone": "8075981695",
    "date_joined": "2025-08-09",
    "date_of_birth": "2004-05-17"
}

ser = UserSerializer(data=data, partial=True)
if not ser.is_valid():
    print(ser.errors)
else:
    print("Valid!")
