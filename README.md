# GestionDeProjet

GestionDeProjet is a role-based project management application built with Angular and Firebase.
It helps teams plan projects, assign tasks, track progress, and validate completed work through an admin review flow.

---

## 1) App Concept

The app is designed around two roles:

- **Admin**: creates projects, assigns team members, manages tasks, reviews submitted work.
- **Employee**: works on assigned tasks, logs progress/time, and submits tasks for admin validation.

The objective is to keep project execution transparent with:

- clear ownership,
- task-level tracking,
- real-time communication,
- and verification before final completion.

---

## 2) Main Functions

### Authentication & Access
- Sign in with Firebase Authentication.
- Role-based access to dashboard pages.

### Project Management (Admin)
- Create, update, and delete projects.
- Assign project team members.
- Track project status and completion.

### Task Management
- Create and assign tasks to employees.
- Set priority, deadline, effort, and reminders.
- Add comments and task activity history.
- Log actual work time.

### Verification Workflow
- Employees cannot directly finalize tasks.
- Employees submit task completion for review.
- Admin reviews and can:
  - approve,
  - reject,
  - or request changes.
- Task status includes `pending-approval` to enforce this gate.

### Communication & Notifications
- Real-time chat between admin and employees.
- Notification center for task/chat/verification events.
- Read/unread synchronization.

---

## 3) Dashboard Overview

### Admin Dashboard
- **Dashboard**: KPIs and project overview.
- **Projects**: project CRUD + team assignment.
- **Tasks**: task creation, updates, bulk actions, reminders.
- **Verification Queue**: pending submissions review.
- **Chat**: employee conversations.
- **Settings**: account/profile area.

### Employee Dashboard
- **Dashboard**: personal stats and progress summary.
- **Projects**: assigned projects and details.
- **Tasks**: progress updates, comments, reminders, review submission.
- **Chat**: communication with admin.
- **Profile**: profile actions.

---

## 4) Project Structure

```text
src/
├── app/
│   ├── core/                          # Singleton services, guards, interceptors
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   └── role.guard.ts
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts
│   │   ├── services/
│   │   │   ├── firebase.service.ts
│   │   │   └── notification.service.ts
│   │   └── core.module.ts
│   │
│   ├── shared/                        # Reusable components, directives, pipes
│   │   ├── components/
│   │   │   ├── loading-spinner/
│   │   │   ├── confirmation-dialog/
│   │   │   ├── notification-bell/
│   │   │   └── task-card/
│   │   ├── directives/
│   │   ├── pipes/
│   │   │   ├── status-color.pipe.ts
│   │   │   └── time-remaining.pipe.ts
│   │   └── shared.module.ts
│   │
│   ├── features/                      # Feature modules (lazy loaded)
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts
│   │   │   └── auth.routes.ts
│   │   │
│   │   ├── admin/
│   │   │   ├── components/
│   │   │   │   ├── admin-dashboard/
│   │   │   │   ├── admin-projects/
│   │   │   │   ├── admin-tasks/
│   │   │   │   ├── verification-queue/
│   │   │   │   └── admin-chat/
│   │   │   ├── services/
│   │   │   │   ├── admin-project.service.ts
│   │   │   │   ├── admin-task.service.ts
│   │   │   │   └── admin-verification.service.ts
│   │   │   ├── models/
│   │   │   │   └── admin.interface.ts
│   │   │   └── admin.routes.ts
│   │   │
│   │   ├── employee/
│   │   │   ├── components/
│   │   │   │   ├── employee-dashboard/
│   │   │   │   ├── my-projects/
│   │   │   │   ├── my-tasks/
│   │   │   │   └── employee-chat/
│   │   │   ├── services/
│   │   │   │   ├── employee-task.service.ts
│   │   │   │   └── employee-project.service.ts
│   │   │   ├── models/
│   │   │   │   └── employee.interface.ts
│   │   │   └── employee.routes.ts
│   │   │
│   │   └── shared-features/           # Features used by both roles
│   │       ├── chat/
│   │       │   ├── components/
│   │       │   │   ├── chat-room/
│   │       │   │   └── chat-message/
│   │       │   ├── services/
│   │       │   │   └── chat.service.ts
│   │       │   └── models/
│   │       │       └── chat.interface.ts
│   │       │
│   │       └── notifications/
│   │           ├── components/
│   │           │   └── notification-list/
│   │           ├── services/
│   │           │   └── notification.service.ts
│   │           └── models/
│   │               └── notification.interface.ts
│   │
│   ├── layout/                        # Layout components
│   │   ├── main-layout/
│   │   │   ├── main-layout.component.ts
│   │   │   └── main-layout.component.html
│   │   ├── sidebar/
│   │   │   ├── sidebar.component.ts
│   │   │   └── sidebar.component.html
│   │   ├── header/
│   │   │   ├── header.component.ts
│   │   │   └── header.component.html
│   │   └── footer/
│   │
│   ├── store/                         # State management (Signals)
│   │   ├── auth/
│   │   │   ├── auth.state.ts
│   │   │   └── auth.store.ts
│   │   ├── project/
│   │   │   ├── project.state.ts
│   │   │   └── project.store.ts
│   │   ├── task/
│   │   │   ├── task.state.ts
│   │   │   └── task.store.ts
│   │   └── index.ts
│   │
│   ├── services/                      # Core business services
│   │   ├── api/
│   │   │   ├── project-api.service.ts
│   │   │   ├── task-api.service.ts
│   │   │   └── user-api.service.ts
│   │   ├── firebase/
│   │   │   ├── firestore.service.ts
│   │   │   └── storage.service.ts
│   │   └── utils/
│   │       ├── date-utils.service.ts
│   │       └── status-utils.service.ts
│   │
│   ├── guards/                        # Route guards
│   │   ├── auth.guard.ts
│   │   └── role.guard.ts
│   │
│   ├── interceptors/                  # HTTP interceptors
│   │   └── error.interceptor.ts
│   │
│   ├── models/                        # Global interfaces
│   │   ├── user.interface.ts
│   │   ├── project.interface.ts
│   │   ├── task.interface.ts
│   │   └── common.interface.ts
│   │
│   ├── constants/                     # Constants and enums
│   │   ├── roles.enum.ts
│   │   ├── status.enum.ts
│   │   └── routes.const.ts
│   │
│   ├── utils/                         # Utility functions
│   │   ├── validators.ts
│   │   └── helpers.ts
│   │
│   ├── app.component.ts
│   ├── app.component.html
│   ├── app.config.ts                  # Standalone app config
│   └── app.routes.ts                  # Main routing
│
├── assets/                            # Static assets
│   ├── images/
│   ├── icons/
│   └── styles/
│       └── tailwind.css
│
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
│
├── styles/
│   ├── _variables.scss
│   ├── _mixins.scss
│   └── global.scss
│
└── index.html
```

### Structure Philosophy
- **Core**: app-wide singleton concerns (guards, interceptors, infrastructure services).
- **Shared**: reusable UI primitives, directives, and pipes.
- **Features**: business domains (auth/admin/employee/shared-features), ideally lazy-loaded.
- **Store**: signal-based centralized state slices.
- **Services/Models/Constants/Utils**: clean separation of business logic, contracts, and helpers.

---

## 5) Tech Stack

- Angular 20 (standalone components)
- Firebase Auth + Firestore
- Angular Signals + computed state
- Tailwind CSS utility styling
- SweetAlert2 dialogs

---

## 6) Business Rules

- Project completion is derived from task completion.
- Deleting a project deletes related tasks.
- Employee cannot mark a task done directly without admin verification.
- Verification data (notes/evidence/time spent) is stored with the task submission.

---

## 7) Local Setup

### Prerequisites
- Node.js (LTS)
- npm
- Firebase project configured for Auth + Firestore

### Install
```bash
npm install
```

### Run (development)
```bash
npm start
```

### Build (development)
```bash
ng build --configuration development
```

### Build (production profile)
```bash
npm run build
```

### Run tests
```bash
npm test
```

---

## 8) Notes

- If `npm run build` fails on bundle budgets, this is usually a production optimization budget constraint (not necessarily a TypeScript error).
- For refactor verification, prefer development build:
  - `ng build --configuration development --watch=false`
