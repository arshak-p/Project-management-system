"""Role-based access tests for the Colour Parrot TMS API."""
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from tms.models import (
    Cycle,
    Department,
    JobTitle,
    Module,
    Project,
    State,
    TimeLog,
    WorkItem,
    WorkItemComment,
)

R = User.Role


def make_user(email, role, dept=None, **extra):
    u = User.objects.create_user(
        username=email.split("@")[0], email=email, password="Str0ng-pass-123", role=role, **extra
    )
    if dept:
        u.tms_profile.department = dept
        u.tms_profile.save()
    return u


class BaseCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.dept_a = Department.objects.create(name="Design", slug="design")
        cls.dept_b = Department.objects.create(name="Content", slug="content")
        cls.admin = make_user("admin@x.com", R.ADMIN)
        cls.pm = make_user("pm@x.com", R.PROJECT_MANAGER)
        cls.head_a = make_user("heada@x.com", R.TEAM_HEAD, cls.dept_a)
        cls.member_a = make_user("membera@x.com", R.SPECIALIST, cls.dept_a)
        cls.member_a2 = make_user("membera2@x.com", R.SPECIALIST, cls.dept_a)
        cls.member_b = make_user("memberb@x.com", R.SPECIALIST, cls.dept_b)
        cls.sales = make_user("sales@x.com", R.SALES_MANAGER)

        cls.project = Project.objects.create(name="Acme", slug="acme")
        cls.s_todo = State.objects.create(name="To Do", slug="todo", sort_order=1)
        cls.s_doing = State.objects.create(name="Doing", slug="doing", sort_order=2)
        cls.module = Module.objects.create(name="Social", slug="social")

        cls.task_a = WorkItem.objects.create(
            project=cls.project, title="A task", state=cls.s_todo, module=cls.module,
            assignee=cls.member_a, department=cls.dept_a, created_by=cls.pm,
        )
        cls.task_b = WorkItem.objects.create(
            project=cls.project, title="B task", state=cls.s_todo, module=cls.module,
            assignee=cls.member_b, department=cls.dept_b, created_by=cls.pm,
        )

    def as_user(self, user):
        self.client.force_authenticate(user)
        return self.client

    def task_ids(self, user):
        r = self.as_user(user).get("/api/work-items/")
        self.assertEqual(r.status_code, 200)
        return {t["id"] for t in r.data}


class VisibilityTests(BaseCase):
    def test_admin_pm_sales_see_all(self):
        for u in (self.admin, self.pm, self.sales):
            self.assertEqual(self.task_ids(u), {self.task_a.id, self.task_b.id})

    def test_member_sees_only_assigned(self):
        self.assertEqual(self.task_ids(self.member_a), {self.task_a.id})
        self.assertEqual(self.task_ids(self.member_b), {self.task_b.id})

    def test_team_head_sees_own_department_only(self):
        self.assertEqual(self.task_ids(self.head_a), {self.task_a.id})

    def test_unauthenticated_blocked(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/work-items/").status_code, 401)

    def test_member_cannot_open_foreign_task(self):
        r = self.as_user(self.member_a).get(f"/api/work-items/{self.task_b.id}/")
        self.assertEqual(r.status_code, 404)


class TaskWriteTests(BaseCase):
    def payload(self, **kw):
        d = {
            "project": self.project.id, "title": "New", "state": self.s_todo.id,
            "module": self.module.id,
        }
        d.update(kw)
        return d

    def test_sales_is_read_only(self):
        c = self.as_user(self.sales)
        self.assertEqual(c.post("/api/work-items/", self.payload()).status_code, 403)
        self.assertEqual(
            c.patch(f"/api/work-items/{self.task_a.id}/", {"title": "x"}).status_code, 403
        )

    def test_member_cannot_create(self):
        r = self.as_user(self.member_a).post("/api/work-items/", self.payload())
        self.assertEqual(r.status_code, 403)

    def test_pm_and_admin_can_create_and_task_code_allocated(self):
        for u in (self.pm, self.admin):
            r = self.as_user(u).post("/api/work-items/", self.payload())
            self.assertEqual(r.status_code, 201, r.data)
            self.assertTrue(r.data["task_code"])

    def test_team_head_create_forced_into_own_department(self):
        r = self.as_user(self.head_a).post("/api/work-items/", self.payload())
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["department"], self.dept_a.id)

    def test_team_head_cannot_use_other_department(self):
        r = self.as_user(self.head_a).post(
            "/api/work-items/", self.payload(department=self.dept_b.id)
        )
        self.assertEqual(r.status_code, 400)

    def test_team_head_cannot_assign_outside_department(self):
        r = self.as_user(self.head_a).post(
            "/api/work-items/", self.payload(assignee_id=self.member_b.id)
        )
        self.assertEqual(r.status_code, 400)

    def test_member_can_move_own_task_state_only(self):
        c = self.as_user(self.member_a)
        r = c.patch(f"/api/work-items/{self.task_a.id}/", {"state": self.s_doing.id})
        self.assertEqual(r.status_code, 200, r.data)
        r = c.patch(f"/api/work-items/{self.task_a.id}/", {"priority": "urgent"})
        self.assertEqual(r.status_code, 400)
        r = c.patch(f"/api/work-items/{self.task_a.id}/", {"assignee_id": self.member_a2.id})
        self.assertEqual(r.status_code, 400)

    def test_member_cannot_edit_others_task(self):
        r = self.as_user(self.member_a).patch(
            f"/api/work-items/{self.task_b.id}/", {"state": self.s_doing.id}
        )
        self.assertEqual(r.status_code, 404)

    def test_delete_only_manager(self):
        self.assertEqual(
            self.as_user(self.member_a).delete(f"/api/work-items/{self.task_a.id}/").status_code, 403
        )
        self.assertEqual(
            self.as_user(self.head_a).delete(f"/api/work-items/{self.task_a.id}/").status_code, 403
        )
        self.assertEqual(
            self.as_user(self.pm).delete(f"/api/work-items/{self.task_a.id}/").status_code, 204
        )

    def test_scheduled_date_roundtrip(self):
        r = self.as_user(self.pm).patch(
            f"/api/work-items/{self.task_a.id}/", {"scheduled_date": "2026-05-01"}
        )
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["scheduled_date"], "2026-05-01")


class ReorderTests(BaseCase):
    def test_reorder_respects_scope_and_states(self):
        c = self.as_user(self.member_a)
        r = c.post("/api/work-items/reorder/", [
            {"id": self.task_a.id, "state": self.s_doing.id, "board_position": 1},
            {"id": self.task_b.id, "state": self.s_doing.id, "board_position": 1},
            {"id": self.task_a.id, "state": 99999, "board_position": 2},
        ], format="json")
        self.assertEqual(r.status_code, 200)
        self.task_a.refresh_from_db()
        self.task_b.refresh_from_db()
        self.assertEqual(self.task_a.state_id, self.s_doing.id)
        self.assertEqual(self.task_b.state_id, self.s_todo.id)

    def test_sales_cannot_reorder(self):
        r = self.as_user(self.sales).post("/api/work-items/reorder/", [], format="json")
        self.assertEqual(r.status_code, 403)


class UserManagementTests(BaseCase):
    def create_payload(self, **kw):
        d = {"email": "new@x.com", "password": "Str0ng-pass-123", "first_name": "N", "role": R.SPECIALIST}
        d.update(kw)
        return d

    def test_only_admin_creates_users(self):
        self.assertEqual(
            self.as_user(self.admin).post("/api/auth/create-user/", self.create_payload()).status_code, 201
        )
        for u in (self.pm, self.head_a, self.member_a, self.sales):
            r = self.as_user(u).post("/api/auth/create-user/", self.create_payload(email="z%d@x.com" % u.id))
            self.assertEqual(r.status_code, 403, u.role)

    def test_invalid_role_and_duplicate_email_rejected(self):
        c = self.as_user(self.admin)
        self.assertEqual(c.post("/api/auth/create-user/", self.create_payload(role="god")).status_code, 400)
        self.assertEqual(c.post("/api/auth/create-user/", self.create_payload(email="ADMIN@x.com")).status_code, 400)

    def test_pm_cannot_escalate_or_touch_admin(self):
        c = self.as_user(self.pm)
        r = c.patch(f"/api/users/{self.member_a.id}/", {"role": R.ADMIN})
        self.assertEqual(r.status_code, 400)
        r = c.patch(f"/api/users/{self.admin.id}/", {"first_name": "Hacked"})
        self.assertEqual(r.status_code, 403)
        r = c.delete(f"/api/users/{self.admin.id}/")
        self.assertEqual(r.status_code, 403)

    def test_pm_can_manage_regular_members(self):
        r = self.as_user(self.pm).patch(f"/api/users/{self.member_a.id}/", {"title": "Designer"})
        self.assertEqual(r.status_code, 200, r.data)

    def test_nobody_can_deactivate_self(self):
        r = self.as_user(self.admin).delete(f"/api/users/{self.admin.id}/")
        self.assertEqual(r.status_code, 403)

    def test_member_cannot_list_or_view_other_users(self):
        c = self.as_user(self.member_a)
        self.assertEqual(c.get("/api/users/").status_code, 403)
        self.assertEqual(c.get(f"/api/users/{self.member_b.id}/").status_code, 403)
        self.assertEqual(c.get(f"/api/users/{self.member_a.id}/").status_code, 200)
        self.assertEqual(c.get("/api/users/me/").status_code, 200)

    def test_assignable_scoped_for_team_head(self):
        r = self.as_user(self.head_a).get("/api/users/assignable/")
        emails = {u["email"] for u in r.data}
        self.assertIn("membera@x.com", emails)
        self.assertNotIn("memberb@x.com", emails)
        self.assertEqual(self.as_user(self.member_a).get("/api/users/assignable/").data, [])


class OwnershipTests(BaseCase):
    def test_comment_edit_delete_only_by_author_or_manager(self):
        c = self.as_user(self.member_a)
        r = c.post("/api/comments/", {"work_item": self.task_a.id, "body": "hello"})
        self.assertEqual(r.status_code, 201, r.data)
        cid = r.data["id"]
        # a teammate who can see the task cannot rewrite it
        WorkItem.objects.filter(pk=self.task_a.pk).update(assignee=self.member_a2)
        self.assertEqual(self.as_user(self.member_a2).patch(f"/api/comments/{cid}/", {"body": "x"}).status_code, 403)
        self.assertEqual(self.as_user(self.member_a2).delete(f"/api/comments/{cid}/").status_code, 403)
        self.assertEqual(self.as_user(self.pm).delete(f"/api/comments/{cid}/").status_code, 204)

    def test_time_log_scoping_and_validation(self):
        c = self.as_user(self.member_a)
        now = timezone.now().isoformat()
        r = c.post("/api/time-logs/", {"work_item": self.task_a.id, "minutes": 30, "logged_at": now})
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["user"]["id"], self.member_a.id)
        self.assertEqual(
            c.post("/api/time-logs/", {"work_item": self.task_a.id, "minutes": 0, "logged_at": now}).status_code, 400
        )
        self.assertEqual(
            c.post("/api/time-logs/", {"work_item": self.task_b.id, "minutes": 5, "logged_at": now}).status_code, 403
        )
        self.assertEqual(self.as_user(self.sales).post(
            "/api/time-logs/", {"work_item": self.task_a.id, "minutes": 5, "logged_at": now}).status_code, 403)

    def test_attachment_validation(self):
        c = self.as_user(self.member_a)
        bad = SimpleUploadedFile("evil.exe", b"MZ", content_type="application/octet-stream")
        r = c.post("/api/attachments/", {"work_item": self.task_a.id, "file": bad}, format="multipart")
        self.assertEqual(r.status_code, 400)


class CatalogueTests(BaseCase):
    def test_cycles_and_catalogues_are_manager_only(self):
        for u in (self.member_a, self.head_a, self.sales):
            c = self.as_user(u)
            self.assertEqual(
                c.post("/api/cycles/", {"project": self.project.id, "name": "C", "start_date": "2026-01-01",
                                        "end_date": "2026-01-31"}).status_code, 403, u.role)
            self.assertEqual(c.post("/api/states/", {"name": "X", "slug": "x"}).status_code, 403)
            self.assertEqual(c.post("/api/job-titles/", {"name": "Designer"}).status_code, 403)
        c = self.as_user(self.pm)
        r = c.post("/api/cycles/", {"project": self.project.id, "name": "C", "start_date": "2026-01-01",
                                    "end_date": "2026-01-31"})
        self.assertEqual(r.status_code, 201, r.data)

    def test_job_title_crud_and_duplicate(self):
        c = self.as_user(self.pm)
        self.assertEqual(c.post("/api/job-titles/", {"name": "Designer"}).status_code, 201)
        self.assertEqual(c.post("/api/job-titles/", {"name": "designer"}).status_code, 400)
        jid = JobTitle.objects.get().id
        self.assertEqual(c.delete(f"/api/job-titles/{jid}/").status_code, 204)
        self.assertEqual(self.as_user(self.member_a).get("/api/job-titles/").status_code, 200)

    def test_department_and_project_writes_manager_only(self):
        self.assertEqual(self.as_user(self.head_a).post("/api/projects/", {"name": "P", "slug": "p"}).status_code, 403)
        self.assertEqual(self.as_user(self.pm).post("/api/projects/", {"name": "P", "slug": "p"}).status_code, 201)


class AnalyticsTests(BaseCase):
    def test_scoped_totals(self):
        self.assertEqual(self.as_user(self.member_a).get("/api/analytics/summary/").data["totals"]["all"], 1)
        self.assertEqual(self.as_user(self.pm).get("/api/analytics/summary/").data["totals"]["all"], 2)

    def test_bad_params_return_400_not_500(self):
        c = self.as_user(self.pm)
        self.assertEqual(c.get("/api/analytics/summary/?start_date=nope").status_code, 400)
        self.assertEqual(c.get("/api/analytics/summary/?department=abc").status_code, 400)

    def test_cycle_progress_scoped(self):
        cy = Cycle.objects.create(project=self.project, name="C", start_date="2026-01-01", end_date="2026-01-31")
        self.assertEqual(self.as_user(self.pm).get(f"/api/analytics/cycles/{cy.id}/progress/").status_code, 200)


class NotificationTests(BaseCase):
    def test_notifications_are_private(self):
        self.as_user(self.pm).patch(f"/api/work-items/{self.task_a.id}/", {"title": "Changed"})
        mine = self.as_user(self.member_a).get("/api/notifications/").data
        other = self.as_user(self.member_b).get("/api/notifications/").data
        self.assertTrue(len(mine) >= 1)
        self.assertEqual(len(other), 0)


class AuthTests(BaseCase):
    def test_login_returns_role(self):
        self.client.force_authenticate(None)
        r = self.client.post("/api/auth/login/", {"email": "pm@x.com", "password": "Str0ng-pass-123"})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["user"]["role"], R.PROJECT_MANAGER)

    def test_bad_login_rejected(self):
        self.client.force_authenticate(None)
        r = self.client.post("/api/auth/login/", {"email": "pm@x.com", "password": "nope"})
        self.assertEqual(r.status_code, 401)

    def test_inactive_user_cannot_login(self):
        self.client.force_authenticate(None)
        User.objects.filter(pk=self.pm.pk).update(is_active=False)
        r = self.client.post("/api/auth/login/", {"email": "pm@x.com", "password": "Str0ng-pass-123"})
        self.assertEqual(r.status_code, 401)
