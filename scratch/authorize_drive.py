import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/drive.file']
CLIENT_SECRET_FILE = r"D:\c p web\cp system\essentials\client_secret_83794101028-s92q8gd0prnt3pl8jkq557tevinlitmd.apps.googleusercontent.com.json"
TOKEN_FILE = r"D:\c p web\web site code CP\python\token.json"

def main():
    flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)
    creds = flow.run_local_server(port=8080, open_browser=False)
    
    with open(TOKEN_FILE, 'w') as token:
        token.write(creds.to_json())
    print(f"Token saved successfully to {TOKEN_FILE}")

if __name__ == '__main__':
    main()
