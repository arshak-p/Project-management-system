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
import csv
import io
from django.core.mail import EmailMessage
from django.db.models import Sum


class Command(BaseCommand):
    help = "Performs monthly backup, retention cleanup, and agency performance summary."

    def handle(self, *args, **options):
        now = datetime.now()
        # Calculate Previous Month range for targeted export
        first_day_this_month = now.replace(day=1)
        last_day_prev_month = first_day_this_month - timedelta(days=1)
        first_day_prev_month = last_day_prev_month.replace(day=1)
        
        prev_month_str = first_day_prev_month.strftime("%Y-%m")
        month_str = prev_month_str  # Use the previous month for the backup label
        
        # 1. Create or get the backup record for this month
        backup_req, created = Backup.objects.get_or_create(
            month=month_str,
            defaults={'is_approved': False}
        )

        # Removed duplicated block
        
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
                try:
                    with open(db_path, 'w') as f:
                        subprocess.run(dump_cmd, env=env, stdout=f, check=True)
                    self.stdout.write(self.style.SUCCESS(f"DB snapshot created at {db_path}"))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"DB snapshot failed (pg_dump might be missing): {e}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error checking DB settings: {e}"))

        # Retention logic disabled per User Request: "Never delete any data"
        self.stdout.write(self.style.NOTICE("Skipping retention cleanup: Permanent Storage Mode Active."))

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
        # (CSV and IO imports moved to top level)

        # 1. Full Master Task Sheet
        task_csv = io.StringIO()
        task_writer = csv.writer(task_csv)
        task_writer.writerow([
            "Task Code", "Title", "Project Name", "Module/Scope", "Current State", "Priority", 
            "Specialist Name", "Total Minutes Logged", "Latest Work Note", "Created At (System)", 
            "Start Date (Do)", "Deadline (Finish)", "Posting Date (Billing)", "Rework Count", 
            "Internal Schedule", "State Durations (Minutes)", "Reference Links", "Description"
        ])
        
        # We backup ALL tasks but highlight current status
        all_tasks = WorkItem.objects.all().select_related('project', 'module', 'state', 'assignee')
        self.stdout.write(f"Exporting {all_tasks.count()} total tasks to Master Sheet...")
        
        for t in all_tasks:
            # Calculate total effort
            total_mins = TimeLog.objects.filter(work_item=t).aggregate(total=Sum('minutes'))['total'] or 0
            latest_log = TimeLog.objects.filter(work_item=t).order_by('-logged_at').first()
            latest_note = latest_log.note if latest_log else ""

            # Format state durations for readability
            state_info = " | ".join([f"{s}: {m}m" for s, m in (t.state_durations or {}).items()])
            
            task_writer.writerow([
                t.task_code, t.title, 
                t.project.name if t.project else "Unlinked",
                t.module.name if t.module else "No Module",
                t.state.name if t.state else "N/A",
                t.priority,
                (t.assignee.get_full_name().strip() or t.assignee.email) if t.assignee else "Unassigned",
                total_mins,
                latest_note,
                t.created_at.strftime("%Y-%m-%d %H:%M"),
                t.due_date or "",
                t.deadline or "",
                t.posting_date or "",
                t.rework_count,
                t.scheduled_date or "",
                state_info,
                t.reference_link or "",
                t.description or ""
            ])
            
        # 2. Detailed Effort Sheet
        time_csv = io.StringIO()
        time_writer = csv.writer(time_csv)
        time_writer.writerow(["Task Code", "User", "Minutes", "Logged Date", "Note"])
        
        # TARGETED: Filter logs specifically from last month
        prev_month_logs = TimeLog.objects.filter(
            logged_at__year=first_day_prev_month.year,
            logged_at__month=first_day_prev_month.month
        ).select_related('work_item', 'user')
        
        self.stdout.write(f"Exporting {prev_month_logs.count()} time logs from {prev_month_str}...")
        
        for tl in prev_month_logs:
            user_str = "N/A"
            if tl.user:
                user_str = tl.user.get_full_name().strip() or tl.user.email
            time_writer.writerow([
                tl.work_item.task_code if tl.work_item else "N/A",
                user_str,
                tl.minutes,
                tl.logged_at.strftime("%Y-%m-%d %H:%M"),
                tl.note or ""
            ])

        # 3. Master Comment Sheet
        comment_csv = io.StringIO()
        comment_w = csv.writer(comment_csv)
        comment_w.writerow(["Task Code", "Author", "Comment Body", "Timestamp"])
        from tms.models import WorkItemComment
        for c in WorkItemComment.objects.all().select_related('work_item', 'author'):
            author_str = "N/A"
            if c.author:
                author_str = c.author.get_full_name().strip() or c.author.email
            comment_w.writerow([c.work_item.task_code, author_str, c.body, c.created_at.strftime("%Y-%m-%d %H:%M")])

        # 4. Universal Activity Audit Sheet
        activity_csv = io.StringIO()
        activity_w = csv.writer(activity_csv)
        activity_w.writerow(["User", "Action", "Entity Type", "Entity ID", "Timestamp"])
        from tms.models import ActivityLog
        for a in ActivityLog.objects.all().select_related('user'):
            activity_w.writerow([
                a.user.get_full_name() if a.user else "System",
                a.action,
                a.entity_type,
                a.entity_id,
                a.created_at.strftime("%Y-%m-%d %H:%M")
            ])

        # Send Email to the system email account (the 5GB vault)
        vault_email = settings.EMAIL_HOST_USER or settings.DEFAULT_FROM_EMAIL
        if vault_email:
            try:
                email = EmailMessage(
                    subject=f"MASTER AGENCY BACKUP - {month_str}",
                    body=(
                        f"This is the automated MASTER backup for {month_str}.\n\n"
                        "Included Attachments:\n"
                        "1. MASTER_TASK_SHEET.csv - Every task and tactical date.\n"
                        "2. EFFORT_LOGS.csv - Minute-by-minute team logs.\n"
                        "3. COMMUNICATION_LOGS.csv - All task discussions.\n"
                        "4. ACTIVITY_HISTORY.csv - Full audit trail of all actions.\n\n"
                        "This email serves as your secure, human-readable cloud vault. Permanent Storage is active."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[vault_email],
                )
                email.attach(f"MASTER_TASK_SHEET_{month_str}.csv", task_csv.getvalue(), "text/csv")
                email.attach(f"EFFORT_LOGS_{month_str}.csv", time_csv.getvalue(), "text/csv")
                email.attach(f"COMMUNICATION_LOGS_{month_str}.csv", comment_csv.getvalue(), "text/csv")
                email.attach(f"ACTIVITY_HISTORY_{month_str}.csv", activity_csv.getvalue(), "text/csv")
                email.send(fail_silently=False)
                self.stdout.write(self.style.SUCCESS(f"Successfully emailed MASTER sheets to {vault_email}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to email backups: {str(e)}"))

        # Upload to Google Drive into a Separate Folder
        drive_key_path = os.path.join(settings.BASE_DIR, 'google_drive_key.json')
        if os.path.exists(drive_key_path):
            self.stdout.write(f"Uploading {month_str} backup to Google Drive...")
            try:
                from google.oauth2 import service_account
                from googleapiclient.discovery import build
                from googleapiclient.http import MediaIoBaseUpload

                SCOPES = ['https://www.googleapis.com/auth/drive']
                creds = service_account.Credentials.from_service_account_file(
                    drive_key_path, scopes=SCOPES)
                drive_service = build('drive', 'v3', credentials=creds)
                
                # 1. Create a folder for the month
                folder_metadata = {
                    'name': f'Backup_{month_str}',
                    'mimeType': 'application/vnd.google-apps.folder'
                }
                folder = drive_service.files().create(body=folder_metadata, fields='id').execute()
                folder_id = folder.get('id')
                
                # 2. Helper to upload files
                def upload_to_drive(filename, file_content_bytes, mime_type):
                    file_metadata = {
                        'name': filename,
                        'parents': [folder_id]
                    }
                    media = MediaIoBaseUpload(io.BytesIO(file_content_bytes), mimetype=mime_type, resumable=True)
                    drive_service.files().create(body=file_metadata, media_body=media, fields='id').execute()
                
                # 3. Upload CSVs
                upload_to_drive(f"MASTER_TASK_SHEET_{month_str}.csv", task_csv.getvalue().encode('utf-8'), "text/csv")
                upload_to_drive(f"EFFORT_LOGS_{month_str}.csv", time_csv.getvalue().encode('utf-8'), "text/csv")
                upload_to_drive(f"COMMUNICATION_LOGS_{month_str}.csv", comment_csv.getvalue().encode('utf-8'), "text/csv")
                upload_to_drive(f"ACTIVITY_HISTORY_{month_str}.csv", activity_csv.getvalue().encode('utf-8'), "text/csv")
                
                # 4. Upload DB Backup
                if os.path.exists(db_path):
                    with open(db_path, 'rb') as f:
                        upload_to_drive(f"db_backup_{month_str}.sql", f.read(), "application/sql")
                
                self.stdout.write(self.style.SUCCESS(f"Successfully uploaded backups to Google Drive in folder: Backup_{month_str}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to upload to Google Drive: {str(e)}"))

        notify_roles(
            roles=[User.Role.ADMIN, User.Role.PROJECT_MANAGER],
            title="📊 Monthly Agency Backup Ready & Emailed",
            body=f"Backup for {month_str} has been automatically sent to your verification email inbox. All activities and data are stored permanently.",
            link="/backups" 
        )

        self.stdout.write(self.style.SUCCESS(f"Monthly backup flow for {month_str} completed."))
