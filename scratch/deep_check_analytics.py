import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from accounts.models import User
from tms.views import AnalyticsSummaryView
from rest_framework.test import APIRequestFactory, force_authenticate

def check_analytics():
    factory = APIRequestFactory()
    view = AnalyticsSummaryView.as_view()
    
    # Try as Ramees (Admin)
    try:
        ramees = User.objects.get(email='rameesoppadanilam@gmail.com')
        request = factory.get('/api/tms/analytics/')
        force_authenticate(request, user=ramees)
        response = view(request)
        
        print(f"Ramees Analytics Status: {response.status_code}")
        if response.status_code == 200:
            data = response.data
            print(f"  Total Tasks: {data['totals']['all']}")
            print(f"  Launched: {data['totals']['completed_or_launched']}")
            print(f"  Efficiency: {data['totals']['efficiency']}%")
            print(f"  Members in list: {len(data['assignee_workload'])}")
    except User.DoesNotExist:
        print("Ramees user not found")

    # Try as Arunima (HR/PM)
    try:
        arunima = User.objects.get(email='arunimabaiju33@gmail.com')
        request = factory.get('/api/tms/analytics/')
        force_authenticate(request, user=arunima)
        response = view(request)
        
        print(f"Arunima Analytics Status: {response.status_code}")
        if response.status_code == 200:
            print(f"  Total Tasks: {response.data['totals']['all']}")
    except User.DoesNotExist:
        print("Arunima user not found")

if __name__ == "__main__":
    check_analytics()
