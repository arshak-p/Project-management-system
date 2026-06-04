# 🦜 Colour Parrot — Complete User Manual
### Every Button, Dropdown, Field, and Modal Explained in Detail

> This user manual serves as the ultimate reference guide for the Colour Parrot Task Management System. It explains the exact purpose, layout, buttons, inputs, and step-by-step procedures for every screen in the system.

---

## 📋 Table of Contents
1. [Global Layout & Navigation (Always Visible)](#1-global-layout--navigation-always-visible)
2. [Login Page](#2-login-page)
3. [Page-by-Page Detailed Button & Field Guide](#3-page-by-page-detailed-button--field-guide)
   - [A. Overview / Dashboard Page](#a-overview--dashboard-page)
   - [B. My Workspace Page](#b-my-workspace-page)
   - [C. Projects Page](#c-projects-page)
   - [D. Tasks Page (Work Items)](#d-tasks-page-work-items)
   - [E. Task Detail Modal (Task Overlay)](#e-task-detail-modal-task-overlay)
   - [F. Cycles Page (Sprint Planning)](#f-cycles-page-sprint-planning)
   - [G. Modules Page (Task Categories)](#g-modules-page-task-categories)
   - [H. Workflow Page (Pipeline Design)](#h-workflow-page-pipeline-design)
   - [I. Backups Page (Data Sovereignty)](#i-backups-page-data-sovereignty)
   - [J. Kanban Page (Visual Board)](#j-kanban-page-visual-board)
   - [K. Team Page (Directory)](#k-team-page-directory)
   - [L. Timesheets Page (Reporting Hub)](#l-timesheets-page-reporting-hub)
   - [M. Profile Page](#m-profile-page)
   - [N. Notifications Page](#n-notifications-page)
   - [O. Activity Page (System Audit Log)](#o-activity-page-system-audit-log)
   - [P. Calendar Page (Tactical Operations)](#p-calendar-page-tactical-operations)
   - [Q. Strategist Page (Mission Control)](#q-strategist-page-mission-control)
   - [R. Team Intelligence Page (Operator Review)](#r-team-intelligence-page-operator-review)
   - [S. Agency Roadmap](#s-agency-roadmap)
4. [Workflow & Status Quick Reference](#4-workflow--status-quick-reference)

---

## 1. Global Layout & Navigation (Always Visible)

No matter what page you are on, the screen is split into a **Left Sidebar** and a **Right Main Area** with a **Top Header**. Here are the global components:

### ⬅️ The Sidebar
*   **Logo & App Name Area (Top Left):** Displays the Colour Parrot icon and "C-Parrot Management". Clicking this area automatically redirects you to the main home page (either `Overview/Dashboard` for managers or `My Workspace` for specialists).
*   **Sidebar Tabs (Navigation Menu):** Buttons representing each page. Clicking a tab takes you to that page. You will only see the tabs your role is authorized to access:
    *   *Admins / Agency Managers:* See all 15 tabs.
    *   *Project Managers:* See 10 tabs.
    *   *Team Heads:* See 10 tabs.
    *   *Specialists:* See `My Workspace`, `Kanban Board`, and `Calendar`.
    *   *HR:* See `Projects`, `Tasks`, `Kanban Board`, `Calendar`, `Team`, and `Team Intelligence`.
*   **Sign Out Button (Bottom Left):** A red button with a log-out icon. Clicking this clears your login token from the browser and returns you to the Login screen.

### ↗️ The Header Bar (Top Right)
*   **Back Button (`← Back`):** Appears next to the sidebar toggle button if you have navigated through pages. Displays your history path. Clicking it returns you to the previous page.
*   **Toggle Theme Button (Moon/Sun Icon):** 
    *   *Moon icon:* Switch the interface to Light Mode.
    *   *Sun icon:* Switch the interface to Dark Mode (default theme).
*   **Notification Bell Icon Button:** Shows a purple badge with a pulsing number if you have unread notifications. Clicking it takes you directly to the `Notifications` page.
*   **Profile Avatar Button:** Circular button displaying your initials (e.g., "JS" for John Smith). Hovering shows your full name. Clicking it takes you to the `Profile` page.

---

## 2. Login Page

This is the gateway to the application. It consists of a centered glassmorphic card.

*   **Email Address Input Field:**
    *   *Label:* `EMAIL ADDRESS`
    *   *Purpose:* Input your registered corporate email.
*   **Password Input Field:**
    *   *Label:* `PASSWORD`
    *   *Purpose:* Input your security key.
    *   *Eye Icon Button (inside password field):* Clicking this toggles the visibility of the text, showing/hiding your password characters.
*   **Enter Dashboard Button:**
    *   *Purpose:* Submits your credentials to authenticate your session.
    *   *Loading State:* Changes to a rotating spinner when checking credentials.

---

## 3. Page-by-Page Detailed Button & Field Guide

---

### A. Overview / Dashboard Page
This page shows high-level agency metrics and active logs.

*   **Month / All Toggle (Top Right):**
    *   *Purpose:* Toggles between viewing metrics for the current calendar month only or all-time historical data.
*   **Metrics Cards:**
    *   *Units Launched:* Total completed/launched tasks.
    *   *Global Task Volume:* Total tasks in the system.
    *   *Active Projects:* Total active projects.
    *   *Pending Tasks:* Non-started tasks. Contains a visual progress bar indicating workload saturation.
*   **Operational Flux Chart (Visual Graph):**
    *   *Purpose:* An area chart showing the velocity of task movements over recent days.
*   **Stage Distribution Chart (Horizontal Bar Chart):**
    *   *Purpose:* Visualizes how many tasks are sitting in each workflow stage.
*   **Sector Activity Stream (List Feed):**
    *   *Purpose:* Shows a live, scrollable list of recent edits made across the agency.
    *   *Action:* Clicking any row in the feed opens the related task in a detailed overlay modal.
*   **Lead Overview (Special View for Team Heads):**
    *   *Left Column ("My Personal Missions"):* Lists tasks assigned directly to the Team Head. Clicking a task opens its detail overlay.
    *   *Right Column ("Team Operations"):* Lists tasks assigned to their team members that are currently waiting in the `Team Head Review` stage.
    *   *✅ Approve Button (Inline on card):* Instantly moves the task from `Team Head Review` to `Client Review`.
    *   *❌ Reject Button (Inline on card):* Instantly moves the task from `Team Head Review` to `Rework / Revision`.

---

### B. My Workspace Page
The personalized workstation for Specialists and Team Heads.

*   **6 Filter Tabs (Top Bar):**
    *   *TODAY'S TASKS:* Active green theme. Shows all active, incomplete tasks.
    *   *START DATE TASKS:* Active blue theme. Filters tasks that have a start/scheduled date set.
    *   *DUE DATE TASKS:* Active amber theme. Filters tasks that have a due date matching the current date.
    *   *DEADLINE TASKS:* Active red theme. Filters tasks that have a hard final deadline.
    *   *COMPLETED TASKS:* Active teal theme. Filters all completed/launched tasks.
    *   *ALL TASKS:* Active slate theme. Shows all assigned tasks.
*   **Personal Performance Tab:**
    *   *Purpose:* Displays personal statistics, task distribution charts, and completion ratios.
*   **Task Cards (Lists):**
    *   *Clicking the card:* Opens the Task Detail Modal.
    *   *Card Border & Glowing Shadow Colors:*
        *   🟢 **Client Approved / Completed-Launched:** Emerald green border with glowing green shadow (`rgba(16, 185, 129, 0.15)`) indicating final verification.
        *   🔵 **Client Review / Pending Review:** Blue border with glowing blue shadow (`rgba(59, 130, 246, 0.15)`) representing active review.
        *   🔴 **Rework / Revision / Re-edit:** Red border with glowing red shadow (`rgba(239, 68, 68, 0.2)`) indicating modifications are needed.
        *   🔴 **Urgent Priority / Overdue Deadline:** Red border with glowing red shadow (`rgba(239, 68, 68, 0.15)`) highlighting immediate attention required.
        *   🟡 **High Priority:** Amber border with glowing amber shadow (`rgba(245, 158, 11, 0.1)`) representing high priority.
        *   🟢 **In Progress:** Primary green border with glowing green shadow (`rgba(16, 185, 129, 0.1)`) representing active development.
        *   ⚪ **Default / Low Priority:** Sleek default gray border.
    *   *Date Badge Color-Coding:*
        *   📅 **Posted Date:** Sky Blue badge (`POSTED: YYYY-MM-DD`) representing assignment post date.
        *   🟢 **Start Date:** Emerald Green badge (`START: YYYY-MM-DD`) representing task start.
        *   🟡 **Due Date:** Amber Yellow badge (`DUE: YYYY-MM-DD`) representing delivery date.
        *   🔴 **Deadline:** Bold Red badge (`DEADLINE: YYYY-MM-DD`) with an active pulse animation representing the absolute deadline.

---

### C. Projects Page
The directory where client projects are created and managed.

*   **Archives Toggle Slider (Top Right):**
    *   *Purpose:* Shows active projects when turned off, and archived/historical projects when turned on.
*   **New Project Button (Top Right):**
    *   *Purpose:* Opens the project creation form.
*   **Project Cards:**
    *   *Initial Avatar Circle:* Colored circle with the first letter of the project name. Clicking it sets a project filter in your memory and takes you to the Tasks page for this project.
    *   *✏️ Edit Button (Pencil Icon - visible on hover):* Opens the Project Edit form.
    *   *📦 Archive Button (Database Icon - visible on hover):* Archives an active project. Triggers confirmation: *"Archive project orbital [Name] to historical storage?"*
    *   *🔁 Restore Button (Plus Icon - visible on archived cards):* Restores an archived project back to active status. Triggers confirmation: *"Restore project orbit [Name] to active status?"*
    *   *Mission Logs Link Button (Bottom Right):* Jumps directly to the Tasks page pre-filtered for this project.
*   **Create/Edit Project Form Modal:**
    *   *Project Name Input Field:* Type name. Auto-fills the Slug field with lowercased hyphens.
    *   *Slug Input Field:* Font-mono field defining URL slug.
    *   *Description Input Field:* Text area for project objectives.
    *   *Glow Color Picker Input:* Open browser color selector to customize the card highlight border.
    *   *Abort Mission Button:* Cancels changes and closes form.
    *   *Create/Update Project Button:* Saves changes to database.

---

### D. Tasks Page (Work Items)
The master log listing every task in the system.

*   **New Task Button (Top Right):**
    *   *Purpose:* Opens the Task Creation Modal.
*   **Search Box Input:**
    *   *Purpose:* Search tasks by typing task code (e.g. CP-12), title, or assignee name.
*   **Completed Toggle Slider:**
    *   *Purpose:* Shows/hides tasks that are marked as Completed / Launched.
*   **Archives Toggle Slider:**
    *   *Purpose:* Shows active tasks when turned off, and archived tasks when turned on.
*   **Filter Dropdowns:**
    *   *Project:* Filters tasks belonging to a specific project.
    *   *Module / Scope:* Filters by category (e.g., Design, Poster, Video).
    *   *State:* Filters by workflow stage.
    *   *Specialist:* Filters by assigned employee.
*   **Date Filters:**
    *   *Post Date:* Filter by task post date.
    *   *Start Date:* Filter by task start date.
    *   *Deadline:* Filter by final deadline.
    *   *Created From / Created To:* Filter by task creation timestamp.
*   **Date Quick Buttons:**
    *   *Today:* Sets creation date range to today.
    *   *Month:* Sets creation date range to the current month.
    *   *Reset All:* Clear all text searches, filters, dropdowns, and date fields back to default.
*   **Task List Rows:**
    *   *Clicking a row:* Opens the Task Detail Modal.
    *   *Archive Task Button (Database Icon - on hover):* Archives task. Confirm: *"Archive this task to historical data?"*
    *   *Restore Task Button (Plus Icon - on archived rows):* Restores task. Confirm: *"Restore this task to active work items?"*

---

### E. Task Detail Modal (Task Overlay)
The central control panel for any individual task. Opens as an overlay on your screen.

#### Left Column Tabs:
*   **Details Tab:** Shows Description brief and the **Execution Timeline**.
    *   *After-Hours Work Tag:* Appears automatically next to timeline items if someone edited or saved the task before 9:00 AM or after 6:00 PM.
*   **Comments Tab:** Contains the communication thread.
    *   *Comment Input Box:* Type updates or questions.
    *   *Send Button (Arrow icon):* Submits your comment.
    *   *Trash Icon (next to comment):* Admins/Authors can click this to delete a comment. Confirm: *"Delete this comment?"*
*   **References Tab:** Project briefs and deliverables files.
    *   *Project Reference Link Input Box:* Paste shared folder URLs (Google Drive, Frame.io).
    *   *Upload File Button:* Opens file selector to upload files directly to the task.
    *   *Download Icon (next to files):* Downloads the attached asset.
    *   *Trash Icon (next to files):* Deletes the attachment. Confirm: *"Delete this attachment?"*
*   **Time Logs Tab:** Time tracking ledger.
    *   *Minutes Input Field:* Type minutes spent (e.g. 90).
    *   *Work Note Input Field:* Describe what you worked on.
    *   *Log Button:* Saves time log.
    *   *Trash Icon (next to logs):* Deletes time log. Confirm: *"Delete this time log?"*

#### Right Column Parameters:
*   **Status / Workflow Dropdown:** Change the workflow stage. Specialists cannot skip to `Client Review` or `Completed`.
*   **Workflow Action Buttons (Contextual - appears based on stage):**
    *   *Approve for Client (Team Head/Admin only during Team Head Review):* Moves task to `Client Review`.
    *   *Reject / Rework (Team Head/Admin only during Team Head Review):* Moves task to `Rework / Revision`.
    *   *Mark Client Approved (PM/Admin only during Client Review):* Marks the task with a green `Client Approved` badge.
    *   *Bypass & Launch (PM/Admin only during Client Review):* Moves task to `Completed / Launched`.
*   **Assignee Dropdown:** Reassign the task to a different specialist.
*   **Timeline Date Inputs:** (Post Date, Deadline, Due Date, Task Start). Click to select dates. Admins/PMs edit all; specialists can only view some.
*   **Action Matrix:**
    *   *Archive Task Button (PM/Admin only):* Moves task to historical storage.
    *   *Hard Delete Button (Admin only):* Permanently erases task and all comments/logs. Confirm: *"💣 PERMANENT DELETE: This cannot be undone. All logs and comments will be erased. Continue?"*

---

### F. Cycles Page (Sprint Planning)
Used to organize projects into weekly or monthly sprint cycles.

*   **Archives Toggle Slider (Top Right):**
    *   *Purpose:* Show active or archived cycles.
*   **Plan Cycle Button (Top Right):**
    *   *Purpose:* Opens the Cycle Creation Modal.
*   **Cycle Cards:**
    *   *✏️ Edit Button (Pencil icon - on hover):* Opens cycle edit form.
    *   *📦 Archive Button (Calendar icon - on hover):* Archives the cycle. Confirm: *"Archive this cycle?"*
    *   *🔁 Restore Button (Plus icon - on archived cards):* Restores archived cycle.
*   **Create/Edit Cycle Modal:**
    *   *Cycle Name Input:* Type cycle identifier (e.g., Week 23 Retainer).
    *   *Client Project Dropdown:* Select project to map the cycle to.
    *   *Start Date / End Date Inputs:* Calendar date inputs.
    *   *Monthly Recurring Retainer Checkbox:* Checks if cycle automatically regenerates monthly.
    *   *Cancel / Create Buttons:* Discard or save the cycle.

---

### G. Modules Page (Task Categories)
Allows defining scope categories like Design, Copywriting, Video, or Development.

*   **Archives Toggle Slider:** Toggles active vs archived categories.
*   **New Module Button:** Opens creation modal.
*   **Module Cards:**
    *   *✏️ Edit Button (Pencil icon):* Edit module name.
    *   *🗑️ Archive Button (Trash icon):* Archives module. Confirm: *"Archive this module to historical data?"*
    *   *🔁 Restore Button (Plus icon):* Restores module. Confirm: *"Restore this module to active status?"*
*   **Create/Edit Module Modal:**
    *   *Module Name Input:* Type category name.
    *   *Cancel / Save Buttons:* Close modal or save.

---

### H. Workflow Page (Pipeline Design)
Allows defining the status workflow pipeline stages.

*   **Archives Toggle Slider:** Shows active/archived stages.
*   **New State Button:** Opens stage creation form.
*   **State Cards:**
    *   *✏️ Edit Button:* Edit stage configuration.
    *   *🗑️ Archive Button:* Archives stage. Confirm: *"Archive this workflow state? Tasks in this state might become inaccessible on the board."*
*   **Create/Edit State Modal:**
    *   *Display Name Input:* Name shown to users (e.g., In Creative Review).
    *   *Unique Slug Input:* Lowercase code identifier.
    *   *Description Textarea:* Brief explanation of what happens in this stage.
    *   *Theme Color Picker Input:* Select the highlight color for this stage.
    *   *Cancel / Save Buttons:* Discard or save.

---

### I. Backups Page (Data Sovereignty)
Manages offline database exports.

*   **Generate Missing Button (Top Right):**
    *   *Purpose:* Triggers database check and builds backups for any missing calendar months. Confirm: *"Generate backup for missing months now? This might take a minute."*
*   **Download Backup Button (Primary color):**
    *   *Purpose:* Starts download of a `.zip` archive containing project details, time logs, and comments. Marks backup as downloaded.
*   **Download Again Button (Glass outline):**
    *   *Purpose:* Appears once a backup is already downloaded. Allows downloading the file again.

---

### J. Kanban Page (Visual Board)
A visual task board.

*   **Filters Dropdowns:** (Projects, Modules, Job Titles). Filters cards visible on the board.
*   **Workflow Column Headers:** Shows stage name, colored status light, and card count.
*   **Drag & Drop Area:** Left-click and hold a task card, drag it to another column, and release to change its status.
*   **Add Task Button (at the bottom of columns):**
    *   *Purpose:* Opens the Quick Task Modal with the column's workflow stage pre-selected.
*   **Quick Task Modal:**
    *   *Task Title Input:* Type task name.
    *   *Project Dropdown:* Select project.
    *   *Priority Dropdown:* Select priority level (Low, Medium, High, Urgent).
    *   *Cancel / Create Buttons:* Submit or cancel.
*   **Task Cards:**
    *   *Clicking card:* Opens the Task Detail Modal.
    *   *Trash Icon (visible on hover):* Deletes task. Confirm: *"Abort this work item permanently?"*

---

### K. Team Page (Directory)
Manages employee accounts, security, and assignments.

*   **Archives Toggle Slider:** Shows active team vs deactivated employees.
*   **Add Member Button (Top Right):**
    *   *Purpose:* Opens the Add Member Modal.
*   **Member Cards:**
    *   *✏️ Edit Member Button (Pencil icon):* Opens edit modal.
    *   *📦 Archive Member Button (Database icon):* Deactivates member immediately. Confirm: *"Archive this team member? Access will be revoked immediately."*
    *   *🔁 Restore Member Button (Plus icon):* Reactivates account. Confirm: *"Restore this team member to active status?"*
*   **Add/Edit Member Modal (Verification Pipeline):**
    *   *First Name / Last Name Inputs:* Type employee name.
    *   *Email Address Input Field:* Type corporate email.
    *   *Send Code Button:* Sends verification code. Shows the code in a green banner (labelled `Tactical Authorization Code`) for easy copy-pasting.
    *   *Code Input Field:* Type the 6-digit verification code.
    *   *Verify Button:* Verifies the email address. Account creation is locked until verified.
    *   *Initial Password / Confirm Password Fields:* Set account password (min 8 characters).
    *   *+ Change Password Link (Edit mode only):* Opens fields to reset password.
    *   *Role Dropdown:* Set user permissions (Admin, PM, Team Head, Specialist, HR, Sales Manager).
    *   *Job Title / Designation Dropdown:* Select employee designation (e.g. Senior Video Editor).
    *   *Phone Number Input:* Type phone.
    *   *Official Joining Date / Date of Birth Inputs:* Calendar date fields.
    *   *Cancel / Save Buttons:* Close modal or save changes.

---

### L. Timesheets Page (Reporting Hub)
Exportable logs of time tracking.

*   **Export Report (CSV) Button (Top Right):**
    *   *Purpose:* Downloads a spreadsheet containing the filtered time logs.
*   **Filter Fields:**
    *   *Team Member Dropdown:* Filters logs by employee.
    *   *Project / Client Dropdown:* Filters logs by project.
    *   *Start Date / End Date Inputs:* Restricts logs to a date range.
*   **Quick Filter Buttons:**
    *   *Today / Last 7 Days / This Month:* Instantly set date ranges.
    *   *Clear All:* Resets all selections.
*   **FLEET CONTRIBUTION horizontal cards:**
    *   *Purpose:* Shows total hours logged by each individual specialist within the filtered view.
*   **Flux Log Rows:**
    *   *Purpose:* Lists individual logs. Clicking a row opens that task's detail modal.

---

### M. Profile Page
Manage your own user profile.

*   *Inputs:* First Name, Last Name, Job Title, Phone.
*   **Save Changes Button:** Saves changes. Displays a green success alert when saved.

---

### N. Notifications Page
Manage your internal inbox.

*   **Mark All Read Button (Top Right):** Marks all unread alerts read.
*   **Enable Desktop Alerts Button (Top Right):** Request browser notification permission to get desktop pop-up alerts.
*   **Notification Rows:**
    *   *Clicking the row:* Marks the notification as read and navigates directly to the target task detail modal or page.
    *   *Mark Read Button (Check icon - on row hover):* Marks a single notification read without navigating.

---

### O. Activity Page (System Audit Log)
The audit trail page.

*   **Search Box Input:** Search actions by keyword or employee email.
*   *Table Columns:* Timestamp, Actor (User), Entity (Type), Action Type, Details.

---

### P. Calendar Page (Tactical Operations)
A calendar dashboard of task schedules.

*   **Project & Module Dropdowns (Top Right):** Filters calendar tasks.
*   **Calendar / Agenda Toggle Buttons:** Switches between monthly grid layout and timeline list view.
*   **Deploy Task Button (Top Right):** Opens Create Modal.
*   **Month Navigation (Header):**
    *   *Chevron Buttons:* Move to previous/next month.
    *   *Today Button:* Reset view to the current month.
*   **Calendar Day Cells:**
    *   *Clicking cell:* Selects day and opens selection details in the sidebar.
    *   *Task Labels inside cells:* Click to open the Task Detail Modal. Shows `START: [Day]` badge on the start date cell.
*   **Sidebar Selection Details:**
    *   *Add Task for this day Button:* Pre-fills the date and opens task creation form.
    *   *Upcoming Milestones:* Lists upcoming tasks.

---

### Q. Strategist Page (Mission Control)
Used by strategists to draft tasks offline and deploy them in bulk.

*   **Strategy Target Dropdown (Top Right):** Select module category for drafted tasks.
*   **Download CSV Button:** Exports draft task list to spreadsheet.
*   **Add Draft Button:** Appends a new blank task draft row.
*   **Deploy Strategy Button (Zap Icon):** Bulk-creates all drafted tasks on the live grid.
*   **Draft Row Elements:**
    *   *Operation Title Input:* Type task title.
    *   *Project Dropdown:* Select project.
    *   *Due / Deadline Inputs:* Select calendar dates.
    *   *Priority Dropdown:* Choose priority level.
    *   *Remove Draft Button (Trash icon):* Deletes this draft row.

---

### R. Team Intelligence Page (Operator Review)
Performance dashboards for managers.

*   **Timeframe Buttons (Daily / Weekly / Monthly / All):** Restricts analytics dates.
*   **Custom Date Range Inputs:** Sets custom range. Click the `X` button to clear custom range.
*   **Find Member Input:** Search list.
*   **Left Sidebar Member Cards:** Lists specialists grouped by designation. Click card to view metrics.
*   **Main Detail Metrics:**
    *   *Time Tracked / Efficiency / Workload Cards:* High-level metrics.
    *   *Sector Velocity Trend AreaChart:* Recharts chart showing productivity.
    *   *Project Saturation PieChart:* Recharts chart showing project counts.
    *   *Recent Mission Parameters List:* Lists tasks done by member. Click to open modal.

---

### S. Agency Roadmap
Roadmap timeline of tasks.

*   *Structure:* Groups active tasks by project, then by workflow state columns.
*   *Task Cards:* Clicking card opens the Task Detail Modal.

---

## 4. Workflow & Status Quick Reference

### Task Priorities
*   🔴 **Urgent:** Mission-critical. Complete immediately.
*   🟠 **High:** Needs resolution within 24–48 hours.
*   🔵 **Medium:** Daily schedule items.
*   ⚫ **Low:** Backlog items.

### Workflow Stages
1.  **Pending:** Created but not started yet.
2.  **In Progress:** Active task (Green border in workspace).
3.  **Team Head Review:** Deliverable uploaded, waiting for team leader check.
4.  **Rework / Revision:** Rejected by team leader (needs corrections).
5.  **Client Review:** Approved by team leader, waiting for client check.
6.  **Completed / Launched:** Fully finished and approved.

---
*Colour Parrot User Manual — Version 2.0*
