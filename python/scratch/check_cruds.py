import os
import sys
import django

# Setup Django path and settings
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'colour_parrot.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status
from tms.models import Project, WorkItem, Cycle, Department, JobTitle, State, Module
from tms.views import ProjectViewSet, WorkItemViewSet, CycleViewSet, DepartmentViewSet, JobTitleViewSet, UserViewSet, BackupViewSet

User = get_user_model()

def run_tests():
    print("--------------------------------------------------")
    print("RUNNING ROLE-BASED CRUD PERMISSIONS VERIFICATION")
    print("--------------------------------------------------")
    
    # 1. Clean up existing verification records to ensure repeatibility
    with transaction.atomic():
        WorkItem.objects.filter(task_code__in=["VERIFY-1", "VERIFY-2"]).delete()
        Project.objects.filter(slug="crud-verify-slug").delete()
        Cycle.objects.filter(name__in=["Verification Sprint", "Sprint A", "Sprint Spec"]).delete()
        Department.objects.filter(slug__in=["eng", "mkt", "specd"]).delete()
        Department.objects.filter(name="Marketing").delete()
        Module.objects.filter(slug="engineering-module").delete()
        User.objects.filter(email__in=[
            "test_admin@colourparrot.com",
            "test_pm@colourparrot.com",
            "test_hr@colourparrot.com",
            "test_spec@colourparrot.com",
            "test_client@colourparrot.com",
            "test_sales@colourparrot.com"
        ]).delete()

    # 2. Create test instances and database data
    with transaction.atomic():
        # Create test instances
        admin_user, _ = User.objects.get_or_create(email="test_admin@colourparrot.com", defaults={"username": "test_admin", "role": "admin"})
        pm_user, _ = User.objects.get_or_create(email="test_pm@colourparrot.com", defaults={"username": "test_pm", "role": "project_manager"})
        hr_user, _ = User.objects.get_or_create(email="test_hr@colourparrot.com", defaults={"username": "test_hr", "role": "hr"})
        specialist_user, _ = User.objects.get_or_create(email="test_spec@colourparrot.com", defaults={"username": "test_spec", "role": "specialist"})
        client_user, _ = User.objects.get_or_create(email="test_client@colourparrot.com", defaults={"username": "test_client", "role": "client"})
        sales_user, _ = User.objects.get_or_create(email="test_sales@colourparrot.com", defaults={"username": "test_sales", "role": "sales_manager"})
        
        # Create a sample project, state, module, and task
        project, _ = Project.objects.get_or_create(name="CRUD Verification Project", defaults={"slug": "crud-verify-slug"})
        state, _ = State.objects.get_or_create(slug="pending", defaults={"name": "Pending", "color": "#000000"})
        department, _ = Department.objects.get_or_create(name="Engineering", defaults={"slug": "eng"})
        module, _ = Module.objects.get_or_create(slug="engineering-module", defaults={"name": "Engineering Module"})
        
        task, _ = WorkItem.objects.get_or_create(
            title="Verification Task",
            defaults={"project": project, "state": state, "assignee": specialist_user, "task_code": "VERIFY-1", "module": module}
        )
        
        import datetime
        today = datetime.date.today()
        tomorrow = today + datetime.timedelta(days=1)
        
        cycle, _ = Cycle.objects.get_or_create(
            name="Verification Sprint",
            defaults={"project": project, "start_date": today, "end_date": tomorrow}
        )

    factory = APIRequestFactory()

    import json
    # Define test helper
    def test_permission(view_class, action, method, url, data=None, user=None, pk=None):
        kwargs = {}
        if data is not None:
            kwargs['data'] = json.dumps(data)
            kwargs['content_type'] = 'application/json'
            
        if pk:
            request = factory.generic(method, f"{url}{pk}/", **kwargs)
            view = view_class.as_view({method.lower(): action})
            if user:
                force_authenticate(request, user=user)
            try:
                response = view(request, pk=pk)
                if response.status_code >= 400 and response.status_code not in (403, 404):
                    print(f"DEBUG {method} {url} {action} returned {response.status_code}: {response.data if hasattr(response, 'data') else ''}")
                return response.status_code
            except Exception as e:
                import rest_framework.exceptions as drf_exc
                from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
                if isinstance(e, (drf_exc.PermissionDenied, DjangoPermissionDenied)):
                    return status.HTTP_403_FORBIDDEN
                raise e
        else:
            request = factory.generic(method, url, **kwargs)
            view = view_class.as_view({method.lower(): action})
            if user:
                force_authenticate(request, user=user)
            try:
                response = view(request)
                if response.status_code >= 400 and response.status_code not in (403, 404):
                    print(f"DEBUG {method} {url} {action} returned {response.status_code}: {response.data if hasattr(response, 'data') else ''}")
                return response.status_code
            except Exception as e:
                import rest_framework.exceptions as drf_exc
                from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
                if isinstance(e, (drf_exc.PermissionDenied, DjangoPermissionDenied)):
                    return status.HTTP_403_FORBIDDEN
                raise e

    # Test suite storage
    results = []

    def log_result(resource, action, role, expected, actual):
        passed = (actual == expected) or (expected == 403 and actual == 404)
        results.append({
            "resource": resource,
            "action": action,
            "role": role,
            "expected": expected,
            "actual": actual,
            "passed": passed
        })
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {resource} - {action} as {role}: Expected {expected}, Got {actual}")

    # --- TEST PROJECT CRUD ---
    # Admin / PM can update project
    log_result("Project", "update", "admin", status.HTTP_200_OK, test_permission(ProjectViewSet, "partial_update", "PATCH", "/api/projects/", {"name": "Updated Admin Project"}, admin_user, project.id))
    log_result("Project", "update", "pm", status.HTTP_200_OK, test_permission(ProjectViewSet, "partial_update", "PATCH", "/api/projects/", {"name": "Updated PM Project"}, pm_user, project.id))
    # Specialists / Sales cannot update project (expected 403)
    log_result("Project", "update", "specialist", status.HTTP_403_FORBIDDEN, test_permission(ProjectViewSet, "partial_update", "PATCH", "/api/projects/", {"name": "Spec Project Change"}, specialist_user, project.id))
    log_result("Project", "update", "sales", status.HTTP_403_FORBIDDEN, test_permission(ProjectViewSet, "partial_update", "PATCH", "/api/projects/", {"name": "Sales Project Change"}, sales_user, project.id))

    # Admin / PM can create task
    log_result("Task", "create", "admin", status.HTTP_201_CREATED, test_permission(WorkItemViewSet, "create", "POST", "/api/work-items/", {"project": project.id, "title": "New Task", "state": state.id, "module": module.id}, admin_user))
    # Specialists cannot create task (expected 403)
    log_result("Task", "create", "specialist", status.HTTP_403_FORBIDDEN, test_permission(WorkItemViewSet, "create", "POST", "/api/work-items/", {"project": project.id, "title": "Spec New Task", "state": state.id, "module": module.id}, specialist_user))
    
    # Specialists can update their own assigned task
    log_result("Task", "update_own", "specialist", status.HTTP_200_OK, test_permission(WorkItemViewSet, "partial_update", "PATCH", "/api/work-items/", {"title": "Updated Spec Task"}, specialist_user, task.id))
    
    # Specialists cannot update unassigned task (create one unassigned or assigned to Admin)
    with transaction.atomic():
        admin_task = WorkItem.objects.create(title="Admin Only Task", project=project, state=state, task_code="VERIFY-2", module=module)
    log_result("Task", "update_other", "specialist", status.HTTP_403_FORBIDDEN, test_permission(WorkItemViewSet, "partial_update", "PATCH", "/api/work-items/", {"title": "Spec Hacked Title"}, specialist_user, admin_task.id))

    # --- TEST USER CRUD ---
    # User can retrieve self
    log_result("User", "retrieve_self", "specialist", status.HTTP_200_OK, test_permission(UserViewSet, "retrieve", "GET", "/api/users/", None, specialist_user, specialist_user.id))
    # User can retrieve another user only if HR/Admin
    log_result("User", "retrieve_other", "specialist", status.HTTP_403_FORBIDDEN, test_permission(UserViewSet, "retrieve", "GET", "/api/users/", None, specialist_user, admin_user.id))
    log_result("User", "retrieve_other", "hr", status.HTTP_200_OK, test_permission(UserViewSet, "retrieve", "GET", "/api/users/", None, hr_user, specialist_user.id))
    
    # Specialist cannot change their own role
    log_result("User", "update_self_role_escalate", "specialist", status.HTTP_400_BAD_REQUEST, test_permission(UserViewSet, "partial_update", "PATCH", "/api/users/", {"role": "admin"}, specialist_user, specialist_user.id))
    # Specialist can change their own first_name
    log_result("User", "update_self_profile", "specialist", status.HTTP_200_OK, test_permission(UserViewSet, "partial_update", "PATCH", "/api/users/", {"first_name": "NewSpecName"}, specialist_user, specialist_user.id))

    # --- TEST DEPARTMENT CRUD ---
    # We want to check if Department writes are restricted to IsHRManagement
    log_result("Department", "create", "hr", status.HTTP_201_CREATED, test_permission(DepartmentViewSet, "create", "POST", "/api/departments/", {"name": "Marketing", "slug": "mkt"}, hr_user))
    log_result("Department", "create", "specialist", status.HTTP_403_FORBIDDEN, test_permission(DepartmentViewSet, "create", "POST", "/api/departments/", {"name": "Specialist Dept", "slug": "specd"}, specialist_user))

    # We want to check if Cycle writes are restricted to IsPMOrAdmin
    log_result("Cycle", "create", "pm", status.HTTP_201_CREATED, test_permission(CycleViewSet, "create", "POST", "/api/cycles/", {"project": project.id, "name": "Sprint A", "start_date": str(today), "end_date": str(tomorrow)}, pm_user))
    log_result("Cycle", "create", "specialist", status.HTTP_403_FORBIDDEN, test_permission(CycleViewSet, "create", "POST", "/api/cycles/", {"project": project.id, "name": "Sprint Spec", "start_date": str(today), "end_date": str(tomorrow)}, specialist_user))

    print("--------------------------------------------------")
    print("PERMISSIONS VERIFICATION SUMMARY")
    print("--------------------------------------------------")
    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    print(f"Total Tests Run: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print("--------------------------------------------------")

if __name__ == "__main__":
    run_tests()
