# 🦜 Colour Parrot Task Management System

A high-performance, premium digital agency command center built for **Colour Parrot**.

## 🚀 Core Features
- **Role-Based Access Control (RBAC)**: Custom views for Admins, Project Managers, Team Heads, Specialists, and Clients.
- **Interactive Kanban & Timeline**: Manage workflows with drag-and-drop convenience.
- **Analytics Dashboard**: Real-time tracking of productivity, work status, and project distribution.
- **Personal Workspace**: Unique dashboards for every team member to track their own performance.
- **Timesheets & Reporting**: Filterable logs with one-click "Today/Week/Month" reporting and CSV/PDF ready views.
- **Real-Time Notifications**: Integrated bell notifications with read-sync across all open tabs.
- **Dark/Light Mode**: Premium glassmorphic design with persistent theme preferences.

## 🛠️ Technology Stack
- **Backend**: Python 3.13 + Django 5.1 + Django REST Framework + JWT Auth.
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons.
- **Real-time**: Django Channels + WebSockets (optional).

## 🏁 Getting Started

### 1. Backend Setup
```bash
cd python
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 2. Frontend Setup
```bash
cd python/frontend
npm install
npm run dev
```

### 3. Seed Data (Optional)
To populate the system with professional agency test data:
```bash
python seed_report.py
```

## 🔒 Security
- **JWT Authentication**: All endpoints require secure token-based login.
- **Row-Level Security**: Users see only what they are authorized to see.
- **CORS Protection**: Secured API access.

---
© 2026 Colour Parrot Digital Agency. All rights reserved.
