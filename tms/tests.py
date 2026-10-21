"""Security regression tests: privilege escalation, throttling and scoping."""
from django.core.cache import cache
from rest_framework.test import APITestCase

from accounts.models import EmailOTP, User
from tms.models import Module, Project, State, WorkItem

R = User.Role


def make_user(email, role, **extra):
    return User.objects.create_user(
        username=email.split("@")[0], email=email, password="Str0ng-pass-123", role=role, **extra
    )


class Base(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = make_user("admin@x.com", R.ADMIN)
        cls.hr = make_user("hr@x.com", R.HR)
        cls.pm = make_user("pm@x.com", R.PROJECT_MANAGER)
        cls.pm2 = make_user("pm2@x.com", R.PROJECT_MANAGER)
        cls.head = make_user("head@x.com", R.TEAM_HEAD)
        cls.member = make_user("member@x.com", R.SPECIALIST)
        cls.member2 = make_user("member2@x.com", R.SPECIALIST)
        cls.strategist = make_user("strat@x.com", R.SALES_MANAGER)
        cls.project = Project.objects.create(name="Acme", slug="acme")
        cls.state = State.objects.create(name="To Do", slug="todo", sort_order=1)
        cls.state2 = State.objects.create(name="Doing", slug="doing", sort_order=2)
        cls.module = Module.objects.create(name="Social", slug="social")
        cls.task = WorkItem.objects.create(
            project=cls.project, title="T", state=cls.state, module=cls.module, assignee=cls.member
        )
        cls.other_task = WorkItem.objects.create(
            project=cls.project, title="U", state=cls.state, module=cls.module, assignee=cls.member2
        )

    def setUp(self):
        cache.clear()

    def as_user(self, user):
        self.client.force_authenticate(user)
        return self.client


class PrivilegeEscalationTests(Base):
    def test_member_cannot_promote_self(self):
        r = self.as_user(self.member).patch(f"/api/users/{self.member.id}/", {"role": R.ADMIN})
        self.assertEqual(r.status_code, 400)
        self.member.refresh_from_db()
        self.assertEqual(self.member.role, R.SPECIALIST)

    def test_pm_cannot_promote_anyone_to_admin(self):
        r = self.as_user(self.pm).patch(f"/api/users/{self.member.id}/", {"role": R.ADMIN})
        self.assertEqual(r.status_code, 400)

    def test_pm_cannot_take_over_admin_account(self):
        c = self.as_user(self.pm)
        self.assertEqual(c.patch(f"/api/users/{self.admin.id}/", {"password": "Hacked-pass-999"}).status_code, 400)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password("Str0ng-pass-123"))

    def test_pm_cannot_edit_other_pm_or_hr(self):
        c = self.as_user(self.pm)
        self.assertEqual(c.patch(f"/api/users/{self.pm2.id}/", {"first_name": "X"}).status_code, 400)
        self.assertEqual(c.patch(f"/api/users/{self.hr.id}/", {"first_name": "X"}).status_code, 400)

    def test_nobody_changes_own_role(self):
        for u in (self.pm, self.hr, self.admin):
            r = self.as_user(u).patch(f"/api/users/{u.id}/", {"role": R.SPECIALIST})
            self.assertEqual(r.status_code, 400, u.role)

    def test_hr_cannot_deactivate_admin_or_self(self):
        c = self.as_user(self.hr)
        self.assertEqual(c.delete(f"/api/users/{self.admin.id}/").status_code, 403)
        self.assertEqual(c.delete(f"/api/users/{self.hr.id}/").status_code, 403)

    def test_admin_can_manage_members(self):
        r = self.as_user(self.admin).patch(f"/api/users/{self.member.id}/", {"role": R.TEAM_HEAD})
        self.assertEqual(r.status_code, 200, r.data)

    def test_hr_can_edit_members(self):
        r = self.as_user(self.hr).patch(f"/api/users/{self.member.id}/", {"title": "Designer"})
        self.assertEqual(r.status_code, 200, r.data)


class CreateUserTests(Base):
    def verified(self, email):
        EmailOTP.objects.create(email=email, otp="123456", is_used=True)

    def payload(self, **kw):
        d = {"email": "new@x.com", "password": "Str0ng-pass-123", "first_name": "N", "role": R.SPECIALIST}
        d.update(kw)
        return d

    def test_hr_can_create_member_but_not_admin(self):
        self.verified("new@x.com")
        c = self.as_user(self.hr)
        self.assertEqual(c.post("/api/auth/create-user/", self.payload(role=R.ADMIN)).status_code, 403)
        self.assertEqual(c.post("/api/auth/create-user/", self.payload()).status_code, 201)

    def test_admin_can_create_admin(self):
        self.verified("new@x.com")
        self.assertEqual(self.as_user(self.admin).post("/api/auth/create-user/", self.payload(role=R.ADMIN)).status_code, 201)

    def test_invalid_role_and_unverified_email_rejected(self):
        c = self.as_user(self.admin)
        self.verified("new@x.com")
        self.assertEqual(c.post("/api/auth/create-user/", self.payload(role="god")).status_code, 400)
        self.assertEqual(c.post("/api/auth/create-user/", self.payload(email="other@x.com")).status_code, 400)

    def test_non_managers_cannot_create(self):
        for u in (self.pm, self.head, self.member, self.strategist):
            self.assertEqual(self.as_user(u).post("/api/auth/create-user/", self.payload()).status_code, 403, u.role)

    def test_duplicate_email_case_insensitive(self):
        self.verified("ADMIN@x.com")
        r = self.as_user(self.admin).post("/api/auth/create-user/", self.payload(email="ADMIN@x.com"))
        self.assertEqual(r.status_code, 400)

    def test_otp_code_is_six_digits(self):
        r = self.as_user(self.hr).post("/api/auth/send-creation-otp/", {"email": "fresh@x.com"})
        if r.status_code == 200:
            code = EmailOTP.objects.get(email="fresh@x.com").otp
            self.assertEqual(len(code), 6)
            self.assertTrue(code.isdigit())


class ThrottleTests(Base):
    def test_login_is_rate_limited(self):
        self.client.force_authenticate(None)
        codes = [
            self.client.post("/api/auth/login/", {"email": "pm@x.com", "password": "wrong"}).status_code
            for _ in range(14)
        ]
        self.assertIn(429, codes)
        self.assertEqual(codes[0], 401)


class ScopingTests(Base):
    def test_reorder_ignores_bad_state_and_foreign_tasks(self):
        r = self.as_user(self.member).post("/api/work-items/reorder/", [
            {"id": self.task.id, "state": 999999, "board_position": 1},
            {"id": self.other_task.id, "state": self.state2.id, "board_position": 1},
            {"id": self.task.id, "state": self.state2.id, "board_position": 2},
        ], format="json")
        self.assertEqual(r.status_code, 200)
        self.task.refresh_from_db()
        self.other_task.refresh_from_db()
        # 'doing' is not a stage a team member may move work into, and the other task isn't theirs
        self.assertEqual(self.task.state_id, self.state.id)
        self.assertEqual(self.other_task.state_id, self.state.id)

    def test_member_sees_only_own_tasks(self):
        ids = {t["id"] for t in self.as_user(self.member).get("/api/work-items/").data}
        self.assertEqual(ids, {self.task.id})


class WorkflowTests(Base):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.s_prog, _ = State.objects.get_or_create(slug="in-progress", defaults={"name": "In Progress", "sort_order": 3})
        cls.s_client, _ = State.objects.get_or_create(slug="client-review", defaults={"name": "Client Review", "sort_order": 4})

    def test_specialist_can_start_own_task(self):
        r = self.as_user(self.member).patch(f"/api/work-items/{self.task.id}/", {"state": self.s_prog.id}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.task.refresh_from_db()
        self.assertEqual(self.task.state_id, self.s_prog.id)

    def test_specialist_cannot_approve_for_client(self):
        r = self.as_user(self.member).patch(f"/api/work-items/{self.task.id}/", {"state": self.s_client.id}, format="json")
        self.assertIn(r.status_code, (400, 403))
        self.task.refresh_from_db()
        self.assertNotEqual(self.task.state_id, self.s_client.id)

    def test_specialist_cannot_reassign_or_edit_fields(self):
        c = self.as_user(self.member)
        url = f"/api/work-items/{self.task.id}/"
        self.assertEqual(c.patch(url, {"assignee_id": self.member2.id}, format="json").status_code, 403)
        self.assertEqual(c.patch(url, {"priority": "urgent"}, format="json").status_code, 403)
        self.task.refresh_from_db()
        self.assertEqual(self.task.assignee_id, self.member.id)

    def test_specialist_cannot_touch_others_task(self):
        r = self.as_user(self.member).patch(f"/api/work-items/{self.other_task.id}/", {"state": self.s_prog.id}, format="json")
        self.assertEqual(r.status_code, 404)

    def test_pm_can_reassign(self):
        r = self.as_user(self.pm).patch(f"/api/work-items/{self.task.id}/", {"assignee_id": self.member2.id}, format="json")
        self.assertEqual(r.status_code, 200, r.data)


class StrategyTests(Base):
    def test_strategies_endpoint_exists_and_is_role_gated(self):
        self.assertEqual(self.as_user(self.strategist).post("/api/strategies/", {"project": self.project.id, "name": "May plan"}).status_code, 201)
        self.assertEqual(self.as_user(self.member).post("/api/strategies/", {"project": self.project.id, "name": "X"}).status_code, 403)
        self.assertEqual(self.as_user(self.member).get("/api/strategies/").status_code, 200)


class ReorderRuleTests(WorkflowTests):
    def test_specialist_cannot_drag_into_client_review(self):
        r = self.as_user(self.member).post("/api/work-items/reorder/", [
            {"id": self.task.id, "state": self.s_client.id, "board_position": 0}], format="json")
        self.assertEqual(r.status_code, 200)
        self.task.refresh_from_db()
        self.assertNotEqual(self.task.state_id, self.s_client.id)

    def test_specialist_can_drag_into_in_progress(self):
        self.as_user(self.member).post("/api/work-items/reorder/", [
            {"id": self.task.id, "state": self.s_prog.id, "board_position": 0}], format="json")
        self.task.refresh_from_db()
        self.assertEqual(self.task.state_id, self.s_prog.id)

    def test_pm_can_drag_anywhere(self):
        self.as_user(self.pm).post("/api/work-items/reorder/", [
            {"id": self.task.id, "state": self.s_client.id, "board_position": 0}], format="json")
        self.task.refresh_from_db()
        self.assertEqual(self.task.state_id, self.s_client.id)
