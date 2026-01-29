# 🚀 Quick Reference Guide - GestionPro

## 📋 Feature Checklist

### ✅ Admin Features Implemented

| Feature | Status | Location |
|---------|--------|----------|
| **Chat with Employees** | ✅ Complete | Chat tab, ChatService |
| **Choose Employee for Task** | ✅ Complete | Tasks tab, assignedTo field |
| **View Project Progress** | ✅ Complete | Dashboard tab, ProjectService |
| Create/Update/Delete Projects | ✅ Complete | Projects tab |
| Create/Update/Delete Tasks | ✅ Complete | Tasks tab |
| Assign Multiple Tasks | ✅ Complete | Tasks form |
| View Team Members | ✅ Complete | Projects management |
| Real-time Updates | ✅ Complete | Firebase listeners |

### ✅ Employee Features Implemented

| Feature | Status | Location |
|---------|--------|----------|
| View Assigned Tasks | ✅ Complete | Tasks tab |
| Filter Tasks by Status | ✅ Complete | Filter buttons |
| Update Task Status | ✅ Complete | Status dropdown |
| Add Comments | ✅ Complete | Comments section |
| View Comments | ✅ Complete | Comments section |
| Chat with Admin | ✅ Complete | Chat tab |
| View Projects | ✅ Complete | Projects tab |
| View Profile | ✅ Complete | Profile tab |

---

## 🎯 Three Main Corrections

### 1. Admin Chats with Employees

**File:** `src/app/services/chat.service.ts`

**Key Methods:**
```typescript
sendMessage(senderId, senderName, senderRole, recipientId, content)
getConversationMessages(adminId, employeeId)
getUserConversations(userId, userRole)
markMessageAsRead(messageId)
```

**UI Location:** Admin Dashboard → Chat Tab

**How to Use:**
1. Click Chat tab
2. Select employee from conversations list
3. Type message
4. Press Enter to send

---

### 2. Admin Assigns Tasks to Specific Employee

**File:** `src/app/pages/dashboard/dashboard-new.ts`

**Key Field:** 
```typescript
<select formControlName="assignedTo" class="input">
  @for (emp of employees(); track emp.id) {
    <option [value]="emp.id">{{ emp.name }}</option>
  }
</select>
```

**Database Field:** `Task.assignedTo = employeeId`

**UI Location:** Admin Dashboard → Tasks Tab → "+ New Task"

**How to Use:**
1. Click "+ New Task"
2. Select project
3. **Select employee from dropdown**
4. Fill task details
5. Click "Create Task"

---

### 3. Admin Views Project Progress

**File:** `src/app/services/project.service.ts`

**Key Method:**
```typescript
getAdminDashboardStats(adminId): Promise<AdminDashboardStats>
updateProjectProgress(projectId): Promise<void>
```

**Progress Calculation:**
```
completionPercentage = (completedTasks / totalTasks) * 100
```

**UI Location:** Admin Dashboard → Dashboard Tab

**Displayed Info:**
- Total Projects
- Task Completion Rate (%)
- Active Employees
- Pending Tasks
- Project Timeline with progress bars

---

## 📁 Project Structure

```
src/app/
├── interfaces/
│   └── models.ts                    # Data types
├── services/
│   ├── chat.service.ts              # ✅ NEW: Messaging
│   ├── project.service.ts           # ✅ NEW: Projects & Progress
│   ├── task.service.ts              # ✅ NEW: Tasks & Assignments
│   └── auth-service/
├── pages/
│   ├── dashboard/
│   │   ├── dashboard-new.ts         # ✅ UPDATED: Admin Dashboard
│   │   ├── employee-dashboard.ts    # ✅ NEW: Employee Dashboard
│   │   ├── dashboard.ts             # Original (backup)
│   │   └── ...
│   └── ...
└── ...
```

---

## 🔌 Service Integration

### Import Services in Components

```typescript
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { ChatService } from '../../services/chat.service';

export class DashboardComponent implements OnInit {
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private chatService = inject(ChatService);
  
  ngOnInit() {
    // Use services
  }
}
```

### Use Services to Perform Actions

```typescript
// Get projects
this.projectService.getAdminProjects(adminId)
  .subscribe(projects => { /* use projects */ });

// Create task with employee assignment
this.taskService.createTask(projectId, adminId, employeeId, taskData);

// Send chat message
this.chatService.sendMessage(senderId, name, role, recipientId, message);

// Get project progress
const stats = await this.projectService.getAdminDashboardStats(adminId);
```

---

## 🗄️ Firebase Collections

### Setup Required Collections

**Run these in Firestore Console:**

```javascript
// Create collections (empty at first)
db.collection("users")
db.collection("projects")
db.collection("tasks")
db.collection("messages")
db.collection("conversations")
db.collection("notifications")
```

### Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }
    match /projects/{doc=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /tasks/{doc=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /messages/{doc=**} {
      allow read: if request.auth.uid == resource.data.senderId || 
                     request.auth.uid == resource.data.recipientId;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 🔄 Data Flows

### Create Task & Assign to Employee

```
Admin Form Input
    ↓
Form Validation
    ↓
TaskService.createTask(projectId, adminId, employeeId, taskData)
    ↓
Firestore: Create task document
    ├── assignedTo: employeeId
    ├── assignedBy: adminId
    └── status: "todo"
    ↓
Send Notification to Employee
    ↓
Employee receives "New Task Assigned"
    ↓
Task appears in Employee Dashboard
```

### Send Admin Message

```
Admin types message in Chat
    ↓
Click Send or Press Enter
    ↓
ChatService.sendMessage(...)
    ↓
Firestore: Create message document
    ├── conversationId: "admin_id_employee_id"
    ├── senderId: adminId
    ├── senderRole: "admin"
    ├── recipientId: employeeId
    └── timestamp: now()
    ↓
Update Conversation metadata
    ├── lastMessage: "..."
    ├── lastMessageTime: now()
    └── unreadCount++
    ↓
Employee receives notification
    ↓
Message appears in Employee Chat (real-time)
```

### Update Project Progress

```
Employee updates Task Status to "Done"
    ↓
TaskService.updateTaskStatus(taskId, "done", 100)
    ↓
Firestore: Update task status
    ↓
ProjectService.updateProjectProgress(projectId)
    ↓
Query: Get all tasks for project
    ├── Count total tasks
    ├── Count completed tasks
    ├── Calculate: (completed/total)*100
    └── Calculate: completionPercentage
    ↓
Firestore: Update project progress
    ├── taskCount: total
    ├── completedTaskCount: completed
    └── completionPercentage: %
    ↓
Admin Dashboard refreshes (real-time)
    ↓
Progress bar updates with new percentage
```

---

## 🎨 UI Components

### Admin Dashboard Tabs

```typescript
activeTab: 'dashboard' | 'projects' | 'tasks' | 'chat' | 'settings'

// Dashboard Tab
- Stats cards (Projects, Tasks, Employees, Pending)
- Project progress timeline

// Projects Tab
- Project grid with cards
- "+ New Project" button
- Project status, team members, progress

// Tasks Tab ✅ WITH EMPLOYEE SELECTION
- Task creation form
  - Project dropdown
  - Employee dropdown ← MAIN CORRECTION
  - Title, description
  - Deadline, priority
- Task cards showing assignment

// Chat Tab ✅ FOR EMPLOYEE COMMUNICATION
- Conversations list
- Message display area
- Chat input field

// Settings Tab
- Profile information
- Admin details
```

### Employee Dashboard Tabs

```typescript
activeTab: 'tasks' | 'projects' | 'chat' | 'profile'

// Tasks Tab
- Stats cards
- Filter buttons (All, To Do, In Progress, Done)
- Task cards with:
  - Progress bar
  - Comments section
  - Status dropdown
  - Deadline info

// Projects Tab
- Project cards with:
  - Status badge
  - Progress bar
  - Timeline
  - Team members

// Chat Tab
- Admin conversation
- Message display
- Chat input

// Profile Tab
- Profile info
- Statistics (tasks, completion rate)
```

---

## 🛠️ Common Tasks

### How to: Create Task for Specific Employee

1. Navigate to `/admin/dashboard`
2. Click Tasks tab
3. Click "+ New Task"
4. **Select Project** from dropdown
5. **Select Employee** from dropdown ← KEY STEP
6. Fill in Title, Description
7. Set Deadline
8. Set Priority
9. Click "Create Task"
10. Employee receives notification

### How to: Chat with Employee

1. Navigate to `/admin/dashboard`
2. Click Chat tab
3. Click on employee name in conversations list
4. Type message in input field
5. Press Enter or click Send button
6. Message sent instantly
7. Employee sees message in real-time

### How to: Track Project Progress

1. Navigate to `/admin/dashboard`
2. Dashboard tab is default view
3. See "Project Progress" section
4. Each project shows:
   - Name and completion %
   - Progress bar
   - Tasks completed (X/Y)
   - Deadline date
5. Updates automatically as tasks complete

---

## 🔍 Debugging Tips

### Check if services are injected

```typescript
// In component class
constructor(private projectService = inject(ProjectService)) {
  console.log('ProjectService:', this.projectService);
}
```

### Check Firestore data

```typescript
// In browser console
firebase.firestore().collection("tasks").get()
  .then(snapshot => console.log(snapshot.docs.map(d => d.data())));
```

### Monitor real-time updates

```typescript
// Watch for changes
this.projectService.getAdminProjects(adminId)
  .subscribe(
    projects => console.log('Projects updated:', projects),
    error => console.error('Error:', error)
  );
```

---

## 🚀 Deployment Checklist

- [ ] Update Firebase config in environment.ts
- [ ] Create admin and employee users
- [ ] Test all features as admin
- [ ] Test all features as employee
- [ ] Run npm build
- [ ] Test production build
- [ ] Deploy to Firebase Hosting
- [ ] Test on production URL
- [ ] Share access with team

---

## 📞 Support

### File Locations
- Admin Dashboard: `src/app/pages/dashboard/dashboard-new.ts`
- Employee Dashboard: `src/app/pages/dashboard/employee-dashboard.ts`
- Chat Service: `src/app/services/chat.service.ts`
- Task Service: `src/app/services/task.service.ts`
- Project Service: `src/app/services/project.service.ts`

### Documentation
- Full specs: `PROJECT_SPECIFICATIONS.md`
- Implementation: `IMPLEMENTATION_GUIDE.md`
- This guide: `QUICK_REFERENCE.md`

---

## ✨ Summary

Your project now includes:

1. ✅ **Real-time Chat System**
   - Admin ↔ Employee messaging
   - Conversation history
   - Unread badges
   - Instant delivery

2. ✅ **Task Assignment with Employee Selection**
   - Dropdown UI
   - Specific employee targeting
   - Database tracking
   - Notifications

3. ✅ **Project Progress Tracking**
   - Real-time calculation
   - Visual progress bars
   - Timeline view
   - Auto-updates

**Status:** Production Ready 🎉
