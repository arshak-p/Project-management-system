import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status
from tms.models import JobTitle
from tms.views import JobTitleViewSet

User = get_user_model()

def test_restore_permissions():
    print("--------------------------------------------------")
    print("VERIFYING JOB TITLE RESTORE PERMISSION CONTROLS")
    print("--------------------------------------------------")
    
    title = JobTitle.objects.create(name="Test Restore Title", is_active=False)
    
    admin_user = User.objects.create(email="adm_restore@test.com", username="adm_restore", role="admin")
    spec_user = User.objects.create(email="spec_restore@test.com", username="spec_restore", role="specialist")
    
    factory = APIRequestFactory()
    view = JobTitleViewSet.as_view({'post': 'restore'})
    
    # Test 1: Specialist tries to restore (should fail with 403)
    req1 = factory.post(f"/api/titles/{title.id}/restore/")
    force_authenticate(req1, user=spec_user)
    try:
        res1 = view(req1, pk=title.id)
        status1 = res1.status_code
    except Exception as e:
        status1 = getattr(e, 'status_code', status.HTTP_403_FORBIDDEN)
        
    print(f"Specialist Restore Access: Got {status1} (Expected 403)")
    
    # Test 2: Admin tries to restore (should succeed with 200)
    req2 = factory.post(f"/api/titles/{title.id}/restore/")
    force_authenticate(req2, user=admin_user)
    res2 = view(req2, pk=title.id)
    status2 = res2.status_code
    print(f"Admin Restore Access: Got {status2} (Expected 200)")
    
    # Cleanup
    title.delete()
    admin_user.delete()
    spec_user.delete()
    
    if status1 == 403 and status2 == 200:
        print("[PASS] Job title restore permissions are successfully secured!")
    else:
        print("[FAIL] Job title restore permissions are not correctly enforced.")
        sys.exit(1)

if __name__ == '__main__':
    test_restore_permissions()
