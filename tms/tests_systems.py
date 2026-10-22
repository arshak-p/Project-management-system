"""End-to-end checks for the OTP, notification, websocket and backup systems."""
import datetime
import io
import zipfile
from unittest import mock

from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.test import TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import EmailOTP, User
from tms.models import Backup, Module, Notification, Project, State, TimeLog, WorkItem, WorkItemComment

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
        cls.member = make_user("member@x.com", R.SPECIALIST)
        cls.member2 = make_user("member2@x.com", R.SPECIALIST)
        cls.project = Project.objects.create(name="Acme", slug="acme")
        cls.state, _ = State.objects.get_or_create(slug="pending", defaults={"name": "Pending", "sort_order": 1})
        cls.module = Module.objects.create(name="Reel", slug="reel")

    def setUp(self):
        cache.clear()
        mail.outbox = []

    def as_user(self, user):
        self.client.force_authenticate(user)
        return self.client


# ---------------------------------------------------------------- OTP
class OTPFlowTests(Base):
    def send(self, email="new@x.com", user=None):
        return self.as_user(user or self.hr).post("/api/auth/send-creation-otp/", {"email": email})

    def verify(self, code, email="new@x.com", user=None):
        return self.as_user(user or self.hr).post("/api/auth/verify-creation-otp/", {"email": email, "otp": code})

    def create(self, email="new@x.com", user=None):
        return self.as_user(user or self.hr).post(
            "/api/auth/create-user/",
            {"email": email, "password": "Str0ng-pass-123", "first_name": "New", "role": R.SPECIALIST},
        )

    def test_code_is_emailed_and_matches_database(self):
        r = self.send()
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["new@x.com"])
        code = EmailOTP.objects.get(email="new@x.com").otp
        self.assertEqual(len(code), 6)
        self.assertIn(code, mail.outbox[0].body)

    def test_full_happy_path_creates_the_account(self):
        self.send()
        code = EmailOTP.objects.get(email="new@x.com").otp
        self.assertEqual(self.verify(code).status_code, 200)
        r = self.create()
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(User.objects.filter(email="new@x.com").exists())

    def test_cannot_create_account_without_verifying(self):
        self.assertEqual(self.create().status_code, 400)
        self.send()  # code sent but never entered
        self.assertEqual(self.create().status_code, 400)

    def test_verifying_one_email_does_not_unlock_another(self):
        self.send("a@x.com")
        self.verify(EmailOTP.objects.get(email="a@x.com").otp, "a@x.com")
        self.assertEqual(self.create("b@x.com").status_code, 400)

    def test_wrong_code_rejected_and_locks_after_three_tries(self):
        self.send()
        real = EmailOTP.objects.get(email="new@x.com").otp
        wrong = "000000" if real != "000000" else "111111"
        self.assertEqual(self.verify(wrong).status_code, 400)
        self.assertEqual(self.verify(wrong).status_code, 400)
        self.assertEqual(self.verify(wrong).status_code, 429)
        # even the right code is refused while locked, and a fresh code does not bypass the lock
        self.assertEqual(self.verify(real).status_code, 429)
        self.send()
        newest = EmailOTP.objects.filter(email="new@x.com").first().otp
        self.assertEqual(self.verify(newest).status_code, 429)

    def test_code_expires_after_ten_minutes(self):
        self.send()
        EmailOTP.objects.filter(email="new@x.com").update(created_at=timezone.now() - datetime.timedelta(minutes=11))
        code = EmailOTP.objects.get(email="new@x.com").otp
        self.assertEqual(self.verify(code).status_code, 400)

    def test_code_cannot_be_used_twice(self):
        self.send()
        code = EmailOTP.objects.get(email="new@x.com").otp
        self.assertEqual(self.verify(code).status_code, 200)
        self.assertEqual(self.verify(code).status_code, 400)

    def test_verification_expires_after_fifteen_minutes(self):
        self.send()
        code = EmailOTP.objects.get(email="new@x.com").otp
        self.verify(code)
        EmailOTP.objects.filter(email="new@x.com").update(created_at=timezone.now() - datetime.timedelta(minutes=16))
        self.assertEqual(self.create().status_code, 400)

    def test_email_failure_is_reported_not_hidden(self):
        with mock.patch("accounts.views.send_mail", side_effect=OSError("smtp down")):
            r = self.send()
        self.assertEqual(r.status_code, 502)
        self.assertFalse(EmailOTP.objects.filter(email="new@x.com").exists())

    def test_existing_member_cannot_be_invited_again(self):
        self.assertEqual(self.send("member@x.com").status_code, 400)

    def test_only_admin_and_hr_can_use_otp(self):
        for u in (self.pm, self.member):
            self.assertEqual(self.send(user=u).status_code, 403, u.role)
            self.assertEqual(self.verify("123456", user=u).status_code, 403, u.role)
        self.assertEqual(self.send(user=self.admin).status_code, 200)

    def test_email_is_case_insensitive(self):
        self.send("Mixed@X.com")
        code = EmailOTP.objects.get(email="mixed@x.com").otp
        self.assertEqual(self.verify(code, "MIXED@x.com").status_code, 200)
        self.assertEqual(self.create("mixed@x.com").status_code, 201)


# ---------------------------------------------------------------- notifications
class NotificationTests(Base):
    def make_task(self, assignee=None):
        return WorkItem.objects.create(
            project=self.project, title="T", state=self.state, module=self.module,
            assignee=assignee, created_by=self.pm,
        )

    def test_assigning_a_task_notifies_only_the_assignee(self):
        r = self.as_user(self.pm).post("/api/work-items/", {
            "project": self.project.id, "title": "New", "state": self.state.id, "module": self.module.id,
            "assignee_id": self.member.id,
        }, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(Notification.objects.filter(user=self.member, title__startswith="Assigned").exists())
        self.assertFalse(Notification.objects.filter(user=self.member2).exists())

    def test_comment_notifies_the_assignee_but_not_the_author(self):
        task = self.make_task(self.member)
        Notification.objects.all().delete()
        r = self.as_user(self.pm).post("/api/comments/", {"work_item": task.id, "body": "please finish"})
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(Notification.objects.filter(user=self.member, title__startswith="New Comment").exists())
        self.assertFalse(Notification.objects.filter(user=self.pm, title__startswith="New Comment").exists())
        # a member's own comment does not notify themselves
        Notification.objects.all().delete()
        self.as_user(self.member).post("/api/comments/", {"work_item": task.id, "body": "on it"})
        self.assertFalse(Notification.objects.filter(user=self.member, title__startswith="New Comment").exists())

    def test_mentions_notify_the_person_mentioned(self):
        task = self.make_task(self.member)
        Notification.objects.all().delete()
        self.as_user(self.pm).post("/api/comments/", {"work_item": task.id, "body": f"hey @{self.member2.email} look"})
        self.assertTrue(Notification.objects.filter(user=self.member2, title__startswith="You were mentioned").exists())

    def test_notifications_are_private(self):
        Notification.objects.create(user=self.member, title="mine")
        other = Notification.objects.create(user=self.member2, title="theirs")
        titles = [n["title"] for n in self.as_user(self.member).get("/api/notifications/").data]
        self.assertEqual(titles, ["mine"])
        self.assertEqual(self.as_user(self.member).post(f"/api/notifications/{other.id}/mark-read/").status_code, 404)
        self.assertTrue(Notification.objects.filter(pk=other.pk).exists())

    def test_mark_read_and_mark_all_only_touch_own_rows(self):
        a = Notification.objects.create(user=self.member, title="a")
        Notification.objects.create(user=self.member, title="b")
        keep = Notification.objects.create(user=self.member2, title="keep")
        c = self.as_user(self.member)
        self.assertEqual(c.post(f"/api/notifications/{a.id}/mark-read/").status_code, 200)
        self.assertEqual(Notification.objects.filter(user=self.member).count(), 1)
        self.assertEqual(c.post("/api/notifications/mark-all-read/").status_code, 200)
        self.assertEqual(Notification.objects.filter(user=self.member).count(), 0)
        self.assertTrue(Notification.objects.filter(pk=keep.pk).exists())

    def test_login_required(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/notifications/").status_code, 401)

    def test_deadline_reminders_reach_the_assignee(self):
        from tms.tasks import check_deadlines
        task = self.make_task(self.member)
        WorkItem.objects.filter(pk=task.pk).update(deadline=datetime.date.today() + datetime.timedelta(days=1))
        check_deadlines()
        self.assertTrue(Notification.objects.filter(user=self.member, title__contains="Reminder").exists())
        self.assertFalse(Notification.objects.filter(user=self.member2, title__contains="Reminder").exists())

    def test_finished_tasks_get_no_reminder(self):
        from tms.tasks import check_deadlines
        done, _ = State.objects.get_or_create(slug="completed-launched", defaults={"name": "Done", "sort_order": 9})
        task = self.make_task(self.member)
        WorkItem.objects.filter(pk=task.pk).update(deadline=datetime.date.today(), state=done)
        check_deadlines()
        self.assertFalse(Notification.objects.filter(user=self.member, title__contains="Reminder").exists())

    def test_birthday_notice_goes_to_everyone_once(self):
        from tms.tasks import check_birthdays
        today = datetime.date.today()
        User.objects.filter(pk=self.member.pk).update(date_of_birth=today.replace(year=1995), first_name="Mira")
        check_birthdays()
        check_birthdays()
        self.assertEqual(Notification.objects.filter(user=self.member, title__startswith="Happy").count(), 1)
        self.assertEqual(Notification.objects.filter(user=self.member2, title__contains="Birthday").count(), 1)


# ---------------------------------------------------------------- websockets
MEMORY_LAYER = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}


@override_settings(CHANNEL_LAYERS=MEMORY_LAYER)
class WebsocketTests(TransactionTestCase):
    def setUp(self):
        cache.clear()
        self.member = make_user("member@x.com", R.SPECIALIST)
        self.other = make_user("other@x.com", R.SPECIALIST)
        self.pm = make_user("pm@x.com", R.PROJECT_MANAGER)
        project = Project.objects.create(name="Acme", slug="acme")
        state, _ = State.objects.get_or_create(slug="pending", defaults={"name": "Pending", "sort_order": 1})
        module = Module.objects.create(name="Reel", slug="reel")
        self.mine = WorkItem.objects.create(project=project, title="Mine", state=state, module=module, assignee=self.member, created_by=self.pm)
        self.theirs = WorkItem.objects.create(project=project, title="Theirs", state=state, module=module, assignee=self.other, created_by=self.pm)

    def comm(self, path, user=None):
        from colour_parrot.asgi import application
        token = f"?token={AccessToken.for_user(user)}" if user else ""
        return WebsocketCommunicator(application, path + token, headers=[(b"origin", b"http://localhost")])

    async def test_notifications_arrive_live(self):
        from tms.notify import notify_user
        comm = self.comm("/ws/notifications/", self.member)
        connected, _ = await comm.connect()
        self.assertTrue(connected)
        await database_sync_to_async(notify_user)(self.member.id, "Hello", "body", "/x")
        msg = await comm.receive_json_from(timeout=3)
        self.assertEqual(msg["type"], "notification")
        self.assertEqual(msg["data"]["title"], "Hello")
        await comm.disconnect()

    async def test_other_users_do_not_receive_my_notifications(self):
        from tms.notify import notify_user
        comm = self.comm("/ws/notifications/", self.other)
        connected, _ = await comm.connect()
        self.assertTrue(connected)
        await database_sync_to_async(notify_user)(self.member.id, "Private", "", "")
        self.assertTrue(await comm.receive_nothing(timeout=0.5))
        await comm.disconnect()

    async def test_anonymous_and_bad_tokens_are_refused(self):
        connected, _ = await self.comm("/ws/notifications/").connect()
        self.assertFalse(connected)
        from colour_parrot.asgi import application
        bad = WebsocketCommunicator(application, "/ws/notifications/?token=garbage", headers=[(b"origin", b"http://localhost")])
        connected, _ = await bad.connect()
        self.assertFalse(connected)

    async def test_task_stream_only_for_people_who_can_see_the_task(self):
        connected, _ = await self.comm(f"/ws/tasks/{self.theirs.id}/", self.member).connect()
        self.assertFalse(connected)
        mine = self.comm(f"/ws/tasks/{self.mine.id}/", self.member)
        connected, _ = await mine.connect()
        self.assertTrue(connected)
        await mine.disconnect()

    async def test_comments_are_pushed_to_the_task_stream(self):
        comm = self.comm(f"/ws/tasks/{self.mine.id}/", self.member)
        connected, _ = await comm.connect()
        self.assertTrue(connected)
        await database_sync_to_async(WorkItemComment.objects.create)(work_item=self.mine, author=self.pm, body="live!")
        msg = await comm.receive_json_from(timeout=3)
        self.assertEqual(msg["type"], "comment")
        self.assertEqual(msg["data"]["body"], "live!")
        await comm.disconnect()

    async def test_deactivated_users_cannot_connect(self):
        token = f"?token={AccessToken.for_user(self.member)}"
        await database_sync_to_async(lambda: User.objects.filter(pk=self.member.pk).update(is_active=False))()
        from colour_parrot.asgi import application
        comm = WebsocketCommunicator(application, "/ws/notifications/" + token, headers=[(b"origin", b"http://localhost")])
        connected, _ = await comm.connect()
        self.assertFalse(connected)


# ---------------------------------------------------------------- backups
class BackupTests(Base):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.task = WorkItem.objects.create(
            project=cls.project, title="Backed up task", state=cls.state, module=cls.module,
            assignee=cls.member, created_by=cls.pm,
        )
        TimeLog.objects.create(work_item=cls.task, user=cls.member, minutes=30, note="work", logged_at=timezone.now())
        WorkItemComment.objects.create(work_item=cls.task, author=cls.pm, body="remember this")

    def make_backup(self):
        call_command("run_monthly_backup", months_ago=1, verbosity=0)
        return Backup.objects.get()

    @override_settings(EXTERNAL_BACKUP_WEBHOOK="", EMAIL_HOST_USER="vault@example.com", DEFAULT_FROM_EMAIL="vault@example.com")
    def test_monthly_command_creates_record_emails_csvs_and_notifies_admins(self):
        backup = self.make_backup()
        self.assertFalse(backup.is_approved)
        self.assertEqual(len(mail.outbox), 1)
        names = [a[0] for a in mail.outbox[0].attachments]
        self.assertEqual(len(names), 4)
        self.assertTrue(any(n.startswith("MASTER_TASK_SHEET") for n in names))
        sheet = [a for a in mail.outbox[0].attachments if a[0].startswith("MASTER_TASK_SHEET")][0][1]
        self.assertIn("Backed up task", sheet)
        self.assertTrue(Notification.objects.filter(user=self.admin, title__contains="Backup").exists())
        self.assertTrue(Notification.objects.filter(user=self.pm, title__contains="Backup").exists())
        self.assertFalse(Notification.objects.filter(user=self.member, title__contains="Backup").exists())

    @override_settings(EXTERNAL_BACKUP_WEBHOOK="")
    def test_running_twice_does_not_duplicate_the_record(self):
        call_command("run_monthly_backup", months_ago=1, verbosity=0)
        call_command("run_monthly_backup", months_ago=1, verbosity=0)
        self.assertEqual(Backup.objects.count(), 1)

    @override_settings(EXTERNAL_BACKUP_WEBHOOK="")
    def test_admin_downloads_a_real_zip_and_it_is_marked_approved(self):
        backup = self.make_backup()
        r = self.as_user(self.admin).post(f"/api/backups/{backup.id}/approve-and-download/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "application/zip")
        zf = zipfile.ZipFile(io.BytesIO(r.content))
        names = zf.namelist()
        self.assertIn("acme/Tasks_Detailed.csv", names)
        self.assertIn("acme/Detailed_Time_Logs.csv", names)
        self.assertIn("acme/All_Task_Comments.csv", names)
        self.assertIn("Beautiful_Agency_Performance_Report.pdf", names)
        self.assertIn("Backed up task", zf.read("acme/Tasks_Detailed.csv").decode())
        self.assertIn("remember this", zf.read("acme/All_Task_Comments.csv").decode())
        # a missing database dump must be called out, never silently left out
        self.assertTrue(any(n.startswith("DATABASE_") for n in names))
        backup.refresh_from_db()
        self.assertTrue(backup.is_approved)
        self.assertEqual(backup.approved_by, self.admin)

    @override_settings(EXTERNAL_BACKUP_WEBHOOK="")
    def test_download_again_works_after_approval_but_not_before(self):
        backup = self.make_backup()
        c = self.as_user(self.admin)
        self.assertEqual(c.get(f"/api/backups/{backup.id}/download/").status_code, 400)
        c.post(f"/api/backups/{backup.id}/approve-and-download/")
        again = c.get(f"/api/backups/{backup.id}/download/")
        self.assertEqual(again.status_code, 200)
        self.assertTrue(zipfile.is_zipfile(io.BytesIO(again.content)))

    @override_settings(EXTERNAL_BACKUP_WEBHOOK="")
    def test_only_admin_can_touch_backups(self):
        backup = self.make_backup()
        for u in (self.pm, self.hr, self.member):
            c = self.as_user(u)
            self.assertEqual(c.get("/api/backups/").status_code, 403, u.role)
            self.assertEqual(c.post(f"/api/backups/{backup.id}/approve-and-download/").status_code, 403, u.role)
            self.assertEqual(c.get(f"/api/backups/{backup.id}/download/").status_code, 403, u.role)
            self.assertEqual(c.post("/api/backups/trigger-automated/").status_code, 403, u.role)
        backup.refresh_from_db()
        self.assertFalse(backup.is_approved)

    @override_settings(EXTERNAL_BACKUP_WEBHOOK="")
    def test_admin_can_trigger_a_backup_and_list_it(self):
        c = self.as_user(self.admin)
        self.assertEqual(c.post("/api/backups/trigger-automated/").status_code, 200)
        self.assertEqual(len(c.get("/api/backups/").data), 1)

    @override_settings(EXTERNAL_BACKUP_WEBHOOK="")
    def test_a_failed_zip_does_not_mark_the_backup_approved(self):
        backup = self.make_backup()
        with mock.patch("tms.views.Project.objects") as boom:
            boom.filter.side_effect = RuntimeError("db exploded")
            with self.assertRaises(RuntimeError):
                self.as_user(self.admin).post(f"/api/backups/{backup.id}/approve-and-download/")
        backup.refresh_from_db()
        self.assertFalse(backup.is_approved)

    def test_beat_schedule_runs_backups_and_reminders(self):
        from django.conf import settings
        tasks = {v["task"] for v in settings.CELERY_BEAT_SCHEDULE.values()}
        self.assertIn("tms.tasks.run_monthly_backup_task", tasks)
        self.assertIn("tms.tasks.check_deadlines", tasks)
        from colour_parrot.celery_app import app
        app.loader.import_default_modules()
        for name in tasks:
            self.assertIn(name, app.tasks, f"{name} is scheduled but not registered with Celery")
