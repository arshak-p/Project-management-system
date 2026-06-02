import os
from google.oauth2 import service_account
from googleapiclient.discovery import build

drive_key_path = 'google_drive_key.json'
try:
    SCOPES = ['https://www.googleapis.com/auth/drive']
    creds = service_account.Credentials.from_service_account_file(
        drive_key_path, scopes=SCOPES)
    drive_service = build('drive', 'v3', credentials=creds)
    
    # 1. Create a folder
    folder_metadata = {
        'name': 'Test_Shared_Folder',
        'mimeType': 'application/vnd.google-apps.folder'
    }
    print("Creating folder...")
    folder = drive_service.files().create(body=folder_metadata, fields='id').execute()
    folder_id = folder.get('id')
    print(f"Success! Folder ID: {folder_id}")
    
    permission = {
        'type': 'user',
        'role': 'writer',
        'emailAddress': 'workflowsecuritycolourparrot@gmail.com'
    }
    drive_service.permissions().create(fileId=folder_id, body=permission, fields='id').execute()
    print("Shared successfully!")
except Exception as e:
    print(f"Error: {e}")
