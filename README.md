# GestionDeProjet

Role-based project management platform built with Angular + Firebase.

It provides two operational dashboards:
- Admin dashboard: project planning, team assignment, task control, verification, and monitoring.
- Employee dashboard: task execution, progress updates, review submission, and collaboration.

---

## 1) Tech Stack

- Frontend: Angular 20 (standalone components)
- Backend/Auth/Data: Firebase Auth + Firestore
- Styling: Tailwind CSS utilities via global design system
- Dialogs & confirmations: SweetAlert2
- State & UI reactivity: Angular signals + computed values
- Realtime communication: Firestore streaming patterns

---

## 2) Routes

- `/signin`
- `/dashboard/admin`
- `/dashboard/employee`

---

## 3) Core Features

- Role-based access (admin vs employee)
- Project lifecycle management (`planning`, `in-progress`, `on-hold`, `completed`)
- Task assignment, prioritization, tracking, comments, reminders, and effort logging
- Project progress computed from task completion
- Realtime chat with unread/read (Sent/Seen) behavior
- In-app notifications for task/chat/verification events
- Task activity timeline (audit-style history)

---

## 4) Task Verification Workflow (Latest Major Update)

### Goal
No task can be considered completed without admin validation.

### Status Flow
- Employee working states: `todo` → `in-progress`
- Submission state: `pending-approval`
- Final state after admin review: `done` (approved) or back to `todo`/`in-progress` (rejected/requested changes)

### Employee Side
- Employees submit a task for review using **Submit for Review**.
- Submission includes:
	- completion notes (required)
	- evidence links (optional)
	- time spent (required)
- Once submitted (`pending-approval`), task edit actions are locked until admin review.
- Direct completion by employee is blocked (no direct “mark done” path).

### Admin Side
- New **Verification Queue** tab in admin dashboard.
- Admin can filter/sort pending submissions and review details.
- Admin review actions:
	- Approve (task becomes `done`)
	- Reject (task returned with feedback)
	- Request changes (task returned with required revisions)

### Data Model Update
Tasks now support `status: 'pending-approval'` and include optional `verification` data:
- `submittedBy`, `submittedAt`, `status`
- `completionNotes`, `evidence[]`, `timeSpent`
- `approvedBy`, `approvedAt`, `rejectionReason`

### Notifications
Verification notifications were added for:
- submission sent to admin
- approval sent to employee
- rejection/changes request sent to employee

---

## 5) Dashboard Functional Resume

### Admin Dashboard

#### Dashboard Tab
- KPIs: project count, task count, completion metrics, active employees
- Project progress visualization

#### Projects Tab
- Create/update/delete projects
- Team member assignment and inline project status updates
- Cascade deletion: deleting a project removes related tasks

#### Tasks Tab
- Create and assign tasks (assignee restricted to project team)
- Priority/deadline/effort/reminder controls
- Bulk task actions
- Comments, reminders, +1h logging, activity history

#### Verification Queue Tab
- Dedicated review pipeline for submitted tasks
- Submission detail view (notes/evidence/time)
- Approve/reject/request changes actions

#### Chat Tab
- Realtime admin-employee conversations
- Sent/Seen indicators and unread badges

#### Settings Tab
- Admin profile and account-related controls

### Employee Dashboard

#### Dashboard Tab
- Personal KPIs and recent work overview

#### Tasks Tab
- Filter/sort tasks by deadline, priority, status, project, score
- Progress slider and task collaboration tools
- Submit completed work for admin verification
- Lock task edits while waiting for review (`pending-approval`)
- Overdue handling with date-only timezone-safe logic

#### Projects Tab
- Assigned project overview and details

#### Chat Tab
- Realtime messaging with admin and read-state synchronization

#### Profile Tab
- Basic profile and productivity snapshot

---

## 6) Service Layer Overview

- `AuthService`: authentication and role resolution
- `ProjectService`: project CRUD, team management, cascade delete, progress aggregation
- `TaskService`: task CRUD, comments, reminders, time logging, activity, verification submit/approve/reject
- `ChatService`: messaging, conversation metadata, read-state handling
- `NotificationService`: create and manage task/chat/verification notifications
- `TaskActivityService`: timeline/audit events for task operations

---

## 7) Business Rules

- Project progress is task-driven:
	- `taskCount = total tasks`
	- `completedTaskCount = tasks with status = done`
	- `completionPercentage = completedTaskCount / taskCount`
- Deleting a project removes all tasks linked to that project
- Dependency feature has been removed from task workflows
- Employee cannot finalize a task without admin verification

---

## 8) UI/UX Notes

- Modernized visual system with Tailwind classes and reusable utility styling
- Material Symbols icon set integrated across dashboards
- SweetAlert2-based confirmation/prompt UX
- Refined chat interface and improved perceived send performance

---

## 9) Local Setup

### Prerequisites
- Node.js (LTS)
- npm
- Firebase project with Auth + Firestore configured

### Install
```bash
npm install
```

### Start
```bash
npm start
```

Default URL: `http://localhost:4200` (or next available port if occupied).

### Build
```bash
npm run build
```

### Test
```bash
npm test
```

---

## 10) Recent Updates Summary

- Added full Task Verification System with admin approval gate
- Added `pending-approval` task status and verification metadata model
- Added admin Verification Queue tab with review actions
- Added employee “Submit for Review” flow and pending-task lock rules
- Added verification notification methods (submitted/approved/rejected)
- Improved chat responsiveness and read-state flow
- Kept project progress strictly aligned with task statuses
