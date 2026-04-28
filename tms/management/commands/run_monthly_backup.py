import os
import subprocess
import shutil
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.conf import settings
from tms.models import Backup, Project, WorkItem, TimeLog
from tms.notify import notify_roles
from accounts.models import User
import urllib.request
import json

class Command(BaseCommand):
    help = "Performs monthly backup, retention cleanup, and agency performance summary."

    def handle(self, *args, **options):
        now = datetime.now()
        month_str = now.strftime("%Y-%m")
        
        # 1. Create or get the backup record for this month
        backup_req, created = Backup.objects.get_or_create(
            month=month_str,
            defaults={'is_approved': False}
        )
        
        if not created and backup_req.is_approved:
            self.stdout.write(self.style.WARNING(f"Backup for {month_str} already approved."))
            return

        # 2. Local Database Snapshot
        db_backup_dir = os.path.join(settings.MEDIA_ROOT, "database_backups")
        os.makedirs(db_backup_dir, exist_ok=True)
        db_path = os.path.join(db_backup_dir, f"db_backup_{month_str}.sql")
        
        try:
            db_settings = settings.DATABASES['default']
            if 'postgresql' in db_settings['ENGINE']:
                env = os.environ.copy()
                env["PGPASSWORD"] = db_settings.get('PASSWORD', '')
                dump_cmd = [
                    "pg_dump", "-h", db_settings.get('HOST', 'localhost'),
                    "-p", str(db_settings.get('PORT', '5432')),
                    "-U", db_settings.get('USER', 'postgres'),
                    "-F", "p", db_settings.get('NAME', 'colour_parrot')
                ]
                with open(db_path, 'w') as f:
                    subprocess.run(dump_cmd, env=env, stdout=f, check=True)
            self.stdout.write(self.style.SUCCESS(f"DB snapshot created at {db_path}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"DB Snapshot failed: {str(e)}"))

        # 3. Suggestion 4: Data Retention Cleanup
        retention_months = settings.BACKUP_RETENTION_MONTHS
        cutoff_date = now - timedelta(days=30 * retention_months)
        expired_backups = Backup.objects.filter(created_at__lt=cutoff_date)
        
        for old_backup in expired_backups:
            self.stdout.write(f"Cleaning up expired backup: {old_backup.month}")
            # Delete physical files if they exist (CSV backups folder)
            old_path = os.path.join(settings.BACKUP_STORAGE_PATH, old_backup.month)
            if os.path.exists(old_path):
                shutil.rmtree(old_path)
            # Delete local DB snapshot
            old_db_snapshot = os.path.join(db_backup_dir, f"db_backup_{old_backup.month}.sql")
            if os.path.exists(old_db_snapshot):
                os.remove(old_db_snapshot)
            old_backup.delete()

        # 4. Suggestion 1: External Webhook (Cloud Sync Simulation)
        if settings.EXTERNAL_BACKUP_WEBHOOK:
            try:
                data = {
                    "event": "backup_ready",
                    "month": month_str,
                    "timestamp": now.isoformat(),
                    "server": "Colour Parrot Primary"
                }
                req = urllib.request.Request(
                    settings.EXTERNAL_BACKUP_WEBHOOK, 
                    data=json.dumps(data).encode('utf-8'),
                    headers={'Content-Type': 'application/json'}
                )
                with urllib.request.urlopen(req, timeout=5) as response:
                    self.stdout.write(self.style.SUCCESS("Cloud Sync Webhook triggered successfully."))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Cloud Sync Webhook failed: {str(e)}"))

        # 5. Notify Admins and Email the Backup
        import csv
        import io
        from django.core.mail import EmailMessage

        # Generate CSV Data (Filtered for this specific month)
        task_csv = io.StringIO()
        task_writer = csv.writer(task_csv)
        task_writer.writerow(["ID", "Code", "Title", "Project", "State", "Assignee", "Created"])
        monthly_tasks = WorkItem.objects.filter(created_at__year=now.year, created_at__month=now.month)
        for t in monthly_tasks:
            task_writer.writerow([t.id, t.task_code, t.title, t.project.name if t.project else "", t.state.name if t.state else "", t.assignee.email if t.assignee else "", t.created_at.strftime("%Y-%m-%d")])
            
        time_csv = io.StringIO()
        time_writer = csv.writer(time_csv)
        time_writer.writerow(["Task", "User", "Minutes", "Note", "Date"])
        monthly_logs = TimeLog.objects.filter(logged_at__year=now.year, logged_at__month=now.month)
        for tl in monthly_logs:
            time_writer.writerow([tl.work_item.task_code if tl.work_item else "", tl.user.email if tl.user else "", tl.minutes, tl.note, tl.logged_at.strftime("%Y-%m-%d")])

        # Send Email to the system email account (the 5GB vault)
        vault_email = settings.EMAIL_HOST_USER or settings.DEFAULT_FROM_EMAIL
        if vault_email:
            try:
                email = EmailMessage(
                    subject=f"Agency Automated Backup - {month_str}",
                    body=f"Attached are the human-readable CSV backups for {month_str}.\n\nThis email serves as your secure, off-site cloud storage vault.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[vault_email],
                )
                email.attach(f"tasks_backup_{month_str}.csv", task_csv.getvalue(), "text/csv")
                email.attach(f"timelogs_backup_{month_str}.csv", time_csv.getvalue(), "text/csv")
                email.send(fail_silently=False)
                self.stdout.write(self.style.SUCCESS(f"Successfully emailed CSV backups to {vault_email}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to email backups: {str(e)}"))

        notify_roles(
            roles=[User.Role.ADMIN, User.Role.PROJECT_MANAGER],
            title="📊 Monthly Agency Backup Ready & Emailed",
            body=f"Backup for {month_str} has been automatically sent to your verification email inbox. We've also performed a {retention_months}-month retention cleanup.",
            link="/backups" 
        )

        self.stdout.write(self.style.SUCCESS(f"Monthly backup flow for {month_str} completed."))
