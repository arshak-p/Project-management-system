# 🦜 Colour Parrot — Task Management System
## Complete User Guide & Role-Based Reference

> This guide explains every feature of the system, organized by role. Share the relevant section with each team member when onboarding them.

---

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Roles at a Glance](#roles-at-a-glance)
3. [Admin / Agency Manager](#admin--agency-manager)
4. [Project Manager](#project-manager)
5. [Strategist (Sales Manager)](#strategist-sales-manager)
6. [Team Head](#team-head)
7. [Specialist / Creator](#specialist--creator)
8. [HR (Human Resources)](#hr-human-resources)
9. [Common Features for Everyone](#common-features-for-everyone)

---

## 🌐 System Overview

The **Colour Parrot Task Management System** is a real-time agency command center. It allows the whole team to track projects, manage tasks, monitor deadlines, and collaborate—all in one place.

Every user logs in with their **email and password**. Once logged in, they see a sidebar with only the tabs that apply to their role. No one sees more than they need to.

---

## 👥 Roles at a Glance

| Role | What They Do |
|------|-------------|
| **Admin / Agency Manager** | Full control — manages everything |
| **Project Manager (PM)** | Manages projects, tasks, cycles, team |
| **Strategist (Sales Manager)** | Strategic overview, can delete projects & tasks |
| **Team Head** | Leads a creative team, reviews & approves team tasks |
| **Specialist / Creator** | The doer — works on assigned tasks |
| **HR** | Manages team, views projects and tasks |

---

## 🔴 Admin / Agency Manager

> **The highest access level. Full control over the entire system.**

### Tabs Available
`Dashboard` `My Workspace` `Projects` `Tasks` `Cycles` `Kanban Board` `Calendar` `Team` `Team Intelligence` `Timesheets` `Activity Log` `Workflow` `Strategist` `Agency Roadmap` `Backups`

---

### 📊 Dashboard
**What it is:** The Command Center — a real-time overview of the entire agency's performance.

**What you'll see:**
- **Units Launched** — total number of tasks completed/launched across all projects
- **Global Task Volume** — total tasks in the system
- **Active Projects** — count of live projects
- **Pending Tasks** — tasks not yet started, with a progress bar showing workload
- **Operational Flux chart** — historical trend line showing daily activity over time
- **Stage Distribution chart** — horizontal bar chart showing how many tasks are in each stage (Pending, In Progress, Review, etc.)
- **Sector Activity Stream** — a live feed of recent actions taken by anyone in the system (task created, status changed, etc.)

**How to use it:**
- Use the **Month / All** toggle (top right) to switch between viewing this month's data or all-time data
- Click any activity card to open that task's full detail

---

### 🗂️ Projects
**What it is:** The master list of all projects in the agency.

**What you'll see:**
- All active projects with their name, client, start date, and status
- Archive toggle to view archived/inactive projects

**What you can do:**
- ➕ **Create new projects** — click the `+ New Project` button
- ✏️ **Edit a project** — click the edit icon on any project card
- 📦 **Archive a project** — removes it from the active list (not deleted)
- 🔁 **Restore an archived project** — from the archived view
- 🗑️ **Delete a project** — permanently removes it *(Admin, PM, Strategist only)*
- Click any project to **go to its tasks**

---

### ✅ Tasks
**What it is:** The global task board — every task across every project.

**What you'll see:**
- All tasks with columns: Task Code, Title, Project, Module, Assignee, State, Priority, Dates
- Glowing card borders and shadows indicating task status:
  - 🟢 **Client Approved / Completed-Launched:** Emerald green border and glowing shadow representing final approval.
  - 🔵 **Client Review / Pending Review:** Blue border and glowing shadow representing review stage.
  - 🔴 **Rework / Revision / Re-edit:** Red border and glowing shadow representing modifications needed.
  - 🔴 **Urgent Priority / Overdue Deadline:** Red border and glowing shadow representing critical urgency.
  - 🟡 **High Priority:** Amber border and glowing amber shadow.
  - 🟢 **In Progress:** Primary green border and glowing shadow representing active execution.
- Date badges color-coded by category:
  - 📅 **Posted Date:** Sky Blue badge representing assignment post date.
  - 🟢 **Start Date:** Emerald Green badge representing task start.
  - 🟡 **Due Date:** Amber Yellow badge representing due date.
  - 🔴 **Deadline:** Bold Red badge with an active pulse animation representing the absolute deadline.

**What you can do:**
- ➕ Create new tasks and assign them to team members
- 🔍 Filter by project, assignee, state, priority
- Click any task to open the **Task Detail Modal** where you can:
  - Change assignee, state, priority, dates
  - Add comments
  - View the full task history
  - Upload files/attachments
- 📦 Archive or 🗑️ Delete tasks

---

### 🔄 Cycles
**What it is:** Sprint-style work cycles. Group tasks into a specific time window (e.g., "Week 22 Sprint").

**What you'll see:**
- All active and past cycles
- Tasks grouped inside each cycle
- Cycle start/end dates and progress

**How to use it:**
- Create a cycle with a start and end date
- Add tasks to the cycle to scope the work for that period
- Useful for weekly or bi-weekly sprints

---

### 📋 Kanban Board
**What it is:** A visual drag-and-drop board showing tasks by status column.

**What you'll see:**
- Columns for each workflow stage (e.g., Pending → In Progress → Team Review → Client Review → Launched)
- Task cards in each column showing the task title, assignee, and priority

**How to use it:**
- Drag a task card from one column to another to **change its status**
- Good for a quick visual overview of where everything stands
- Filter by project or assignee to focus on a subset of tasks

---

### 📅 Calendar
**What it is:** A monthly calendar view of all tasks based on their due dates and deadlines.

**What you'll see:**
- Tasks plotted on the dates they are due
- Color coding by priority or status

**How to use it:**
- Navigate month by month to see what's coming up
- Click any task on the calendar to open its full details
- Great for spotting deadline collisions and overloaded days

---

### 👥 Team
**What it is:** The full team directory.

**What you'll see:**
- All users in the system with their name, role, email, and profile details
- Activity status (last active time)

**What you can do:**
- View each team member's profile
- ➕ Invite/add new team members
- Edit user roles and details
- Deactivate team members who have left

---

### ⚡ Team Intelligence
**What it is:** A smart performance analytics dashboard for the whole team.

**What you'll see:**
- Individual performance metrics for each team member
- Task completion rates, rework counts, speed scores
- Comparative rankings
- Workload distribution across the team

**How to use it:**
- Use this to identify high performers and bottlenecks
- Spot who has too many tasks or who has capacity for more
- Track quality (rework count = how many times a task was sent back for revisions)

---

### 🕐 Timesheets
**What it is:** A time-based log of task activity.

**What you'll see:**
- Records of when tasks were started, updated, and completed
- Time spent tracking

**How to use it:**
- Review how long tasks are taking vs. their estimates
- Useful for billing and capacity planning

---

### 📜 Activity Log *(Admin, PM, Agency Manager only)*
**What it is:** An immutable, full audit trail of every single action taken in the system.

**What you'll see:**
- Timestamp of every action
- Who did it (actor)
- What they did (created, updated, deactivated, deleted)
- Which record was affected

**How to use it:**
- Use the **search bar** to filter by user email, action type, or entity
- Cannot be edited or deleted — it's a permanent record
- Use this to investigate issues or audit activity

---

### 🔀 Workflow *(Admin, Agency Manager only)*
**What it is:** The pipeline designer — define the stages a task moves through.

**What you'll see:**
- The list of all task states/stages (e.g., "Pending", "In Progress", "Team Head Review", "Client Review", "Launched")

**What you can do:**
- Add new stages
- Reorder the pipeline
- Configure which stage means "completed"

> ⚠️ Changes here affect the entire system — all tasks use these stages.

---

### 🌟 Strategist *(Admin, Agency Manager only)*
**What it is:** A high-level strategic view — the **Lifecycle & Tracking Ledger**.

**What you'll see:**
- A detailed table of all tasks with:
  - Task code, Specialist name, Module, Assigned date, Started date, Completed date, Target/Due date, Rework count
- Color-coded dates: Green = on time, Yellow = at risk, Red = overdue

**How to use it:**
- Use this for client reporting and strategic reviews
- Track which tasks have been reworked and how many times
- Identify quality and delivery issues at a glance

---

### 🗺️ Agency Roadmap *(Admin, Agency Manager only)*
**What it is:** A visual timeline roadmap of all active projects.

**What you'll see:**
- Projects laid out on a horizontal timeline
- Start dates and end dates plotted visually

**How to use it:**
- Get a bird's-eye view of the agency's project schedule
- Spot overlapping projects and resource conflicts

---

### 💾 Backups *(Admin, Agency Manager only)*
**What it is:** Database backup management.

**What you can do:**
- Create a manual backup of the entire system database
- Download existing backups
- Restore from a previous backup if something goes wrong

> ⚠️ Only use restore if directed by your technical team. This will overwrite current data.

---

## 🟠 Project Manager

> **Manages day-to-day operations, creates and assigns tasks, oversees projects.**

### Tabs Available
`Dashboard` `Projects` `Tasks` `Cycles` `Kanban Board` `Calendar` `Team` `Team Intelligence` `Timesheets` `Activity Log`

All tabs work the same as described in the Admin section above.

### Key Permissions
- ✅ Can create, edit, archive, and **delete** projects and tasks
- ✅ Can assign tasks to any team member
- ✅ Can view the full Activity Log
- ✅ Can manage cycles/sprints
- ❌ Cannot access Workflow, Strategist, Agency Roadmap, or Backups

---

## 🟡 Strategist (Sales Manager)

> **Strategic-level access. Can manage and delete projects and tasks.**

### Tabs Available
`Projects` `Tasks` `Kanban Board` `Calendar` `Team` `Team Intelligence`

### Key Permissions
- ✅ Can view all projects and tasks
- ✅ Can **delete** projects and tasks (same as PM)
- ✅ Can view team performance
- ❌ Does not have the Dashboard, Cycles, Timesheets, Activity Log, or admin-only pages

### How to use it:
- Use **Projects** to monitor all client work
- Use **Tasks** to review progress and identify delays
- Use **Team Intelligence** to track performance metrics for reporting

---

## 🔵 Team Head

> **Leads a creative team. Sees their own tasks AND their team's work. Approves tasks before they go to the client.**

### Tabs Available
`Dashboard` `My Workspace` `Projects` `Tasks` `Cycles` `Kanban Board` `Calendar` `Team` `Team Intelligence` `Timesheets`

---

### 📊 Dashboard (Team Head View)
The Team Head sees a **special two-column dashboard** called **Lead Overview**:

**Left column — Personal Workspace (My Missions)**
- Shows tasks that are **assigned directly to the Team Head themselves**
- Each card shows: Task Code, Project, Module, Status
- Click any card to open full task details

**Right column — Team Operations (Review Pipeline)**
- Shows tasks assigned to **their team members** that need review or attention
- Tasks with status **"Team Head Review"** will show special **Approve / Reject** buttons inline
- Click **Approve** → task moves forward to the next stage
- Click **Reject** → task is sent back to the specialist for rework

**How to use it daily:**
1. Check the **left column** first — are your own tasks progressing?
2. Check the **right column** — are there tasks waiting for your approval?
3. Click `Approve` on quality work, `Reject` on work that needs changes
4. Click any task to open full details and leave a comment explaining rejection reason

---

### 🎯 My Workspace *(Team Head & Specialist)*
**What it is:** A dedicated personal task board just for your own assigned tasks.

**The 6 Filter Tabs:**
- **TODAY'S TASKS:** Active green theme. Shows all active, incomplete tasks.
- **START DATE TASKS:** Active blue theme. Filters tasks that have a start/scheduled date.
- **DUE DATE TASKS:** Active amber theme. Filters tasks that have a due date matching today.
- **DEADLINE TASKS:** Active red theme. Filters tasks with a hard final deadline.
- **COMPLETED TASKS:** Active teal theme. Filters all completed/launched tasks.
- **ALL TASKS:** Active slate theme. Shows all tasks.

**Color-coded task borders & shadows:**
- 🟢 **Client Approved / Completed-Launched:** Emerald green border with glowing green shadow (`rgba(16, 185, 129, 0.15)`).
- 🔵 **Client Review / Pending Review:** Blue border with glowing blue shadow (`rgba(59, 130, 246, 0.15)`).
- 🔴 **Rework / Revision / Re-edit:** Red border with glowing red shadow (`rgba(239, 68, 68, 0.2)`).
- 🔴 **Urgent Priority / Overdue Deadline:** Red border with glowing red shadow (`rgba(239, 68, 68, 0.15)`).
- 🟡 **High Priority:** Amber border with glowing amber shadow (`rgba(245, 158, 11, 0.1)`).
- 🟢 **In Progress:** Primary green border with glowing green shadow (`rgba(16, 185, 129, 0.1)`).

**Date Badge Colors:**
- 📅 **Posted Date:** Sky Blue badge (`POSTED: YYYY-MM-DD`).
- 🟢 **Start Date:** Emerald Green badge (`START: YYYY-MM-DD`).
- 🟡 **Due Date:** Amber Yellow badge (`DUE: YYYY-MM-DD`).
- 🔴 **Deadline:** Bold Red badge (`DEADLINE: YYYY-MM-DD`) with pulse animation.

**How to use it daily:**
1. Open the system → you land on **Today's Task** tab
2. Work through your task list
3. Click any task to open it and update the status, add comments, or upload files
4. Switch to **Due Date** tab to prioritize urgent items
5. Check **Deadline** tab to see what's critically close

---

### All Other Tabs
Work exactly the same as the Admin/PM descriptions above, but **filtered to show only relevant data** (tasks from their team's projects).

### Key Permissions
- ✅ Can view all projects
- ✅ Can view and manage tasks for their team
- ✅ Can approve/reject tasks at the "Team Head Review" stage
- ❌ Cannot delete projects or tasks
- ❌ No access to Activity Log, Workflow, Strategist, Roadmap, Backups

---

## 🟢 Specialist / Creator

> **The person doing the work. Focused on their own assigned tasks.**

### Tabs Available
`My Workspace` `Kanban Board` `Calendar`

---

### 🎯 My Workspace *(Main Page)*
This is the **primary workspace** for Specialists. Everything they need to manage their daily work is here.

**The 6 Filter Tabs:**
- **TODAY'S TASKS:** Active green theme. Shows all active, incomplete tasks.
- **START DATE TASKS:** Active blue theme. Filters tasks that have a start/scheduled date.
- **DUE DATE TASKS:** Active amber theme. Filters tasks that have a due date matching today.
- **DEADLINE TASKS:** Active red theme. Filters tasks with a hard final deadline.
- **COMPLETED TASKS:** Active teal theme. Filters all completed/launched tasks.
- **ALL TASKS:** Active slate theme. Shows all tasks.

**Color-coded task borders & shadows:**
- 🟢 **Client Approved / Completed-Launched:** Emerald green border with glowing green shadow (`rgba(16, 185, 129, 0.15)`).
- 🔵 **Client Review / Pending Review:** Blue border with glowing blue shadow (`rgba(59, 130, 246, 0.15)`).
- 🔴 **Rework / Revision / Re-edit:** Red border with glowing red shadow (`rgba(239, 68, 68, 0.2)`).
- 🔴 **Urgent Priority / Overdue Deadline:** Red border with glowing red shadow (`rgba(239, 68, 68, 0.15)`).
- 🟡 **High Priority:** Amber border with glowing amber shadow (`rgba(245, 158, 11, 0.1)`).
- 🟢 **In Progress:** Primary green border with glowing green shadow (`rgba(16, 185, 129, 0.1)`).

**Date Badge Colors:**
- 📅 **Posted Date:** Sky Blue badge (`POSTED: YYYY-MM-DD`).
- 🟢 **Start Date:** Emerald Green badge (`START: YYYY-MM-DD`).
- 🟡 **Due Date:** Amber Yellow badge (`DUE: YYYY-MM-DD`).
- 🔴 **Deadline:** Bold Red badge (`DEADLINE: YYYY-MM-DD`) with pulse animation.

**Priority indicators on each task:**
- 🔴 Urgent
- 🔥 High
- 🔵 Medium
- ⚪ Low

**Performance tab:**
Switch to the **Performance** tab inside My Workspace to see:
- Your personal task completion chart (by project)
- Task distribution by status
- Your completion rate and trends

**How to use it daily:**
1. Log in → go to **My Workspace** → **Today's Task** tab
2. See all your active tasks sorted by priority
3. Click a task → the **Task Detail** panel opens showing:
   - Task description and brief
   - Attached files from PM/Team Head
   - Comment section (write updates or questions here)
   - Current status and dates
4. Update the task status as you progress (e.g., from "In Progress" → "Team Head Review")
5. At end of day, check the **Due Date** tab to see what's coming up

> 💡 **Tip:** When you finish a task, change the status to "Team Head Review" — this alerts your Team Head to check your work.

---

### 📋 Kanban Board
Shows all tasks across projects in a visual column layout.
- Specialists can see their own tasks here as well
- Good for a quick visual overview of their pipeline

---

### 📅 Calendar
Shows all tasks on a monthly calendar by due date.
- Click any date to see what's due
- Great for planning your week

### Key Permissions
- ✅ Can view and update their own assigned tasks
- ✅ Can add comments on tasks
- ✅ Can upload files/deliverables to tasks
- ✅ Can change task status (to submit work for review)
- ❌ Cannot create projects or tasks
- ❌ Cannot assign tasks to others
- ❌ Cannot delete anything

---

## 🟣 HR (Human Resources)

> **People management focus. Can see all projects and tasks, but cannot modify them.**

### Tabs Available
`Projects` `Tasks` `Kanban Board` `Calendar` `Team` `Team Intelligence`

---

### How HR Uses the System

**Projects** — See all active projects (read access)

**Tasks** — View all tasks across all projects to understand team workload

**Team** — Full access to the team directory:
- View all employee profiles
- Add new team members
- Edit team member details (role, contact info, job title)
- Deactivate members who have left

**Team Intelligence** — The most important tab for HR:
- View performance scores for each team member
- See task completion rates, rework frequency, and activity levels
- Use for **performance reviews** and **capacity planning**
- Identify overloaded team members

**Kanban Board & Calendar** — Read-only view to understand current work status

### Key Permissions
- ✅ Can view all projects and tasks
- ✅ Full access to Team management
- ✅ Can view Team Intelligence metrics
- ❌ Cannot create or modify tasks
- ❌ Cannot delete projects or tasks
- ❌ No access to Activity Log, Workflow, Strategist, Roadmap, Backups, Timesheets

---

## 🌍 Common Features for Everyone

These features are available to **all users** regardless of role:

---

### 🔔 Notifications
- Click the **bell icon** (top right) to open Notifications
- Shows **Unread** notifications (highlighted in green, slide in from right)
- Shows **Earlier** (already read) notifications below
- Click **Mark read** on individual notifications, or **Mark all as read** button
- Click a notification to jump directly to the related task or page
- Click **Enable Desktop Alerts** to get browser push notifications even when the tab is minimized

---

### 👤 Profile
- Click your **avatar/initials** (top right corner) to go to your profile
- Update your: Name, Phone, Profile photo, Date of birth
- Change your password

---

### 🌙 Dark / Light Mode
- Click the **moon / sun icon** (top right) to toggle between dark and light themes
- The system defaults to dark mode

---

### 📋 Task Detail Modal
When you click any task anywhere in the system, a **full detail panel** opens showing:

| Field | Description |
|-------|-------------|
| **Task Code** | Unique identifier (e.g., H-1, Z-3) |
| **Title** | Name of the task |
| **Project** | Which client project it belongs to |
| **Module** | The category/type of work (e.g., Poster, Video, Copy) |
| **Assignee** | Who is responsible for this task |
| **State/Status** | Current workflow stage |
| **Priority** | Urgent / High / Medium / Low |
| **Posting Date** | When the task was started/assigned |
| **Due Date** | Target completion date |
| **Deadline** | Hard final deadline |
| **Comments** | Team discussion thread — add notes, feedback, questions |
| **Attachments** | Files uploaded (briefs, references, deliverables) |

---

## 🚦 Task Status Colors (Quick Reference)

| Card Border & Glow | Meaning |
|-------------|---------|
| 🟢 Emerald Green Glow | Client Approved / Completed-Launched |
| 🔵 Blue Glow | In-House Approved / Client Review / Pending Review |
| 🔴 Red Glow (Pulsing) | Rework / Revision / Re-Edit or Urgent Priority / Overdue Deadline |
| 🟡 Amber Glow | High Priority |
| 🟢 Primary Green Glow | In Progress |
| ⚪ Slate Grey | Low/Medium Priority |

---

## ❓ Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Changes not showing after uploading | Press **Ctrl+Shift+R** for hard refresh, or open in incognito window |
| Can't see a tab | Your role doesn't have access to it — contact your Admin |
| Task not showing in My Workspace | Make sure the task is assigned to your account |
| Notification bell shows a number but clicking shows nothing | Press **Mark all as read** — the notification may have already been actioned |
| Site looks old/cached | Open in a new **incognito/private** browser window |

---

*Document generated for Colour Parrot internal use — Management System v2.0*
