# 🚀 Getting Started Guide - GestionPro

A quick start guide to get your project running with all three corrections.

---

## ⚡ 5-Minute Quick Start

### Step 1: Review the Key Files (2 min)
Start here:
1. `src/app/interfaces/models.ts` - Understand data structures
2. `src/app/services/project.service.ts` - Project logic
3. `src/app/services/task.service.ts` - Task assignment logic
4. `src/app/services/chat.service.ts` - Chat logic

### Step 2: View the Components (2 min)
- `src/app/pages/dashboard/dashboard-new.ts` - Admin UI (all 3 features)
- `src/app/pages/dashboard/employee-dashboard.ts` - Employee UI

### Step 3: Read Documentation (1 min)
- `QUICK_REFERENCE.md` - For quick lookups
- `CORRECTION_SUMMARY.md` - For detailed info

---

## 🏗️ Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Firebase
Edit `src/environments/environment.ts`:
```typescript
export const environment = {
  firebaseConfig: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  }
};
```

### 3. Create Firebase Collections
In Firestore Console, create:
- `users` - User data
- `projects` - Project information
- `tasks` - Tasks with assignments
- `messages` - Chat messages
- `conversations` - Chat conversations
- `notifications` - System notifications

### 4. Update Routes
In `src/app/app.routes.ts`, add:
```typescript
{
  path: 'admin/dashboard',
  component: DashboardComponent,
  canActivate: [adminGuard]
},
{
  path: 'employee/dashboard',
  component: EmployeeDashboardComponent,
  canActivate: [employeeGuard]
}
```

### 5. Create Test Users
In Firebase Auth, create:
- Admin user: `admin@test.com` / password
- Employee user: `emp1@test.com` / password

In Firestore `users` collection:
```javascript
// Admin User
{
  uid: "admin_uid",
  email: "admin@test.com",
  name: "John Admin",
  role: "admin",
  createdAt: Timestamp
}

// Employee User
{
  uid: "emp1_uid",
  email: "emp1@test.com",
  name: "Jane Employee",
  role: "employee",
  createdAt: Timestamp
}
```

---

## 🧪 Testing the Features

### Test 1: Task Assignment ✅

**As Admin:**
1. Navigate to `/admin/dashboard`
2. Click "Tasks" tab
3. Click "+ New Task"
4. **Select project from dropdown**
5. **Select employee from dropdown** ← KEY TEST
6. Fill task details
7. Click "Create Task"

**Expected Result:**
- Task appears in task list
- Task shows employee name

**As Employee:**
1. Navigate to `/employee/dashboard`
2. Click "My Tasks"
3. **See newly assigned task** ← VERIFICATION

---

### Test 2: Admin-Employee Chat ✅

**As Admin:**
1. Navigate to `/admin/dashboard`
2. Click "Chat" tab
3. **See list of employees**
4. Click on employee name
5. Type message: "Hi Jane, how are you?"
6. Press Enter

**Expected Result:**
- Message appears in chat
- Message shows timestamp

**As Employee:**
1. Navigate to `/employee/dashboard`
2. Click "Chat" tab
3. **See admin message instantly**
4. Type reply: "Hi John, all good!"
5. Press Enter

**Expected Result:**
- Message appears in chat
- Admin sees reply immediately

---

### Test 3: Project Progress ✅

**As Admin:**
1. Navigate to `/admin/dashboard`
2. Click "Dashboard" tab (default)
3. **See "Project Progress" section**
4. See project with progress bar

**Expected Result:**
- Project shows with progress bar
- Shows X/Y tasks completed
- Shows completion percentage

**Then (As Employee):**
1. Go to `/employee/dashboard`
2. Click "My Tasks"
3. Select a task
4. Change status: "To Do" → "Done"

**Back (As Admin):**
1. Go back to `/admin/dashboard`
2. **Refresh Dashboard tab**
3. **Project progress increased!**

**Expected Result:**
- Progress bar updated
- Task count increased
- Percentage recalculated

---

## 🎯 Feature Checklist

### ✅ Chat System
- [ ] Admin can see list of employees
- [ ] Admin can send message
- [ ] Employee receives message instantly
- [ ] Employee can reply
- [ ] Admin sees reply instantly
- [ ] Messages show timestamps
- [ ] Conversation history displays

### ✅ Task Assignment
- [ ] Task form shows employee dropdown
- [ ] Dropdown populated with employees
- [ ] Admin can select employee
- [ ] Task created with employeeId
- [ ] Employee receives notification
- [ ] Employee sees task in list
- [ ] Task shows employee name

### ✅ Progress Tracking
- [ ] Dashboard shows project cards
- [ ] Each project has progress bar
- [ ] Percentage displays correctly
- [ ] Task count shows X/Y
- [ ] Progress updates when task status changes
- [ ] Real-time refresh in dashboard

---

## 🐛 Common Issues & Solutions

### Issue: Employees dropdown empty
**Solution:**
- Check `users` collection in Firestore
- Verify `role` field = "employee"
- Verify documents are not empty

### Issue: Messages not appearing
**Solution:**
- Check Firestore security rules
- Verify `conversations` collection exists
- Check network connection
- Verify conversation ID format

### Issue: Progress not updating
**Solution:**
- Check task status updates
- Verify `tasks` collection exists
- Check project ID matches
- Refresh page to see update

### Issue: Components not loading
**Solution:**
- Check route configuration
- Verify component imports
- Check Firebase configuration
- Check browser console for errors

---

## 📝 Code Snippets

### Use ChatService
```typescript
import { ChatService } from '../../services/chat.service';

// In component
private chatService = inject(ChatService);

// Send message
await this.chatService.sendMessage(
  adminId,
  "John Admin",
  "admin",
  employeeId,
  "Hello Jane!"
);

// Get conversations
this.chatService.getUserConversations(adminId, 'admin')
  .subscribe(conversations => {
    // Use conversations
  });
```

### Use TaskService
```typescript
import { TaskService } from '../../services/task.service';

// In component
private taskService = inject(TaskService);

// Create task with employee assignment
await this.taskService.createTask(
  projectId,
  adminId,
  employeeId,  // ← Selected employee
  {
    title: "Design Homepage",
    description: "...",
    deadline: new Date(),
    priority: "high"
  }
);

// Get employee tasks
this.taskService.getEmployeeTasks(employeeId)
  .subscribe(tasks => {
    // Use tasks
  });
```

### Use ProjectService
```typescript
import { ProjectService } from '../../services/project.service';

// In component
private projectService = inject(ProjectService);

// Get dashboard stats
const stats = await this.projectService.getAdminDashboardStats(adminId);
console.log(stats.projectProgress);  // Array of project progress

// Update project progress
await this.projectService.updateProjectProgress(projectId);
```

---

## 📊 Database Queries

### Get All Employees
```typescript
const employees = await getDocs(
  query(
    collection(db, 'users'),
    where('role', '==', 'employee')
  )
);
```

### Get Employee Tasks
```typescript
const tasks = await getDocs(
  query(
    collection(db, 'tasks'),
    where('assignedTo', '==', employeeId)
  )
);
```

### Get Admin Conversations
```typescript
const conversations = await getDocs(
  query(
    collection(db, 'conversations'),
    where('adminId', '==', adminId)
  )
);
```

### Get Project Tasks
```typescript
const tasks = await getDocs(
  query(
    collection(db, 'tasks'),
    where('projectId', '==', projectId)
  )
);
```

---

## 🚀 Deployment Checklist

Before going live:

- [ ] Test all features locally
- [ ] Configure production Firebase
- [ ] Create production users
- [ ] Test authentication
- [ ] Verify all routes work
- [ ] Test chat in real-time
- [ ] Verify task assignment
- [ ] Check progress tracking
- [ ] Test on mobile/tablet
- [ ] Run security rules check
- [ ] Deploy to Firebase Hosting

---

## 🔧 Development Commands

### Start Development Server
```bash
npm start
# or
ng serve
```

Access at: `http://localhost:4200`

### Build for Production
```bash
npm run build
# or
ng build --configuration production
```

### Deploy to Firebase
```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

### Run Tests
```bash
npm test
```

---

## 📱 Testing on Different Devices

### Desktop (Chrome/Firefox/Safari)
- Full interface works
- All features functional
- Responsive layout

### Tablet (iPad/Android)
- Compact sidebar
- Touch-friendly
- 2-column layout

### Mobile (iPhone/Android)
- Single column
- Stacked layout
- Touch buttons optimized

---

## 🔐 Security Configuration

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }
    
    // Messages
    match /messages/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Tasks
    match /tasks/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Projects
    match /projects/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 📞 Support

### For Questions:
1. Check `QUICK_REFERENCE.md` first
2. Review `IMPLEMENTATION_GUIDE.md`
3. Look at `VISUAL_ARCHITECTURE.md`
4. Check code comments in services

### Common Sections:
- **Chat:** `chat.service.ts` lines 1-50
- **Task Assignment:** `task.service.ts` lines 30-80
- **Progress:** `project.service.ts` lines 200-250
- **Admin UI:** `dashboard-new.ts` lines 50-150
- **Employee UI:** `employee-dashboard.ts` lines 50-150

---

## ✅ Success Criteria

Your setup is successful when:

✅ Admin can assign tasks to specific employees
✅ Admin can chat with employees in real-time
✅ Admin can see project progress update in real-time
✅ Employees can view assigned tasks
✅ Employees can update task status
✅ Employees can chat with admin
✅ Progress bar updates when tasks complete
✅ All features work on mobile devices

---

## 🎉 You're Ready!

You now have:
- ✅ Complete feature set
- ✅ Working real-time chat
- ✅ Employee task assignment
- ✅ Real-time progress tracking
- ✅ Professional UI
- ✅ Full documentation

**Start building and deploying!** 🚀

---

**Happy Coding!**

For more details, see:
- `PROJECT_SPECIFICATIONS.md` - Full documentation
- `QUICK_REFERENCE.md` - Quick lookup
- `IMPLEMENTATION_GUIDE.md` - Step-by-step
- Code comments in services

Good luck with GestionPro! 🎊
