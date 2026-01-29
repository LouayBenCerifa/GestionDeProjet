# 📊 GestionPro - Project Management Application

A modern, professional project management web application built with **Angular 20** and **Firebase**, designed for enterprise-level team collaboration with real-time features.

---

## 🎯 Project Overview

**GestionPro** is a comprehensive project management solution with role-based access for two user types: **Admin** and **Employee**. The application provides real-time collaboration, task management, progress tracking, and direct messaging capabilities.

---

## 👥 User Roles & Features

### 🔐 Admin Dashboard

**Access Control:** Only administrators can access the admin dashboard
**Restricted Route:** `/admin/dashboard`

#### Key Features:

1. **Dashboard Overview**
   - Total projects count (active & completed)
   - Task completion rate (%)
   - Active employees count
   - Pending tasks overview
   - Project progress timeline with visual indicators

2. **Project Management (CRUD Operations)**
   - ✅ **Create** new projects with:
     - Project name & description
     - Start and end dates
     - Initial status (Planning, In Progress, On Hold, Completed)
     - Team member assignment
   - ✏️ **Update** existing projects
   - 🗑️ **Delete** projects
   - 📊 View project progress and completion percentage
   - Real-time progress calculation based on task completion

3. **Task Assignment & Management**
   - 📋 Create tasks with:
     - Project selection
     - **Employee selection** - Choose which employee to assign the task to
     - Task title and detailed description
     - Deadline setting
     - Priority levels (Low, Medium, High, Urgent)
     - Automatic status set to "To Do"
   - 📌 Assign multiple tasks to specific employees
   - Update task details and reassign if needed
   - Track task completion percentage
   - Delete completed or obsolete tasks

4. **Project Progress Tracking**
   - 📈 **Visual progress bars** showing project completion
   - 📊 **Timeline view** with start and end dates
   - 📉 **Task statistics** (completed vs. total)
   - 🎯 **Real-time updates** as employees update task status
   - **Progress calculation**: (Completed Tasks / Total Tasks) × 100

5. **Real-Time Chat with Employees**
   - 💬 **Direct messaging** with individual employees (users)
   - 📱 Chat interface showing:
     - Conversation list with employee avatars
     - Last message preview
     - Unread message count badges
     - Message timestamps
   - 🔔 Real-time notifications of new messages
   - ✅ Mark messages as read
   - 📤 Send messages and receive responses instantly
   - Message history per conversation

6. **Employee Selection & Team Management**
   - 👥 View all active employees
   - 🔗 Assign employees to projects
   - 📋 Add employees to team
   - Remove employees from projects

7. **Navigation & Organization**
   - 📊 Dashboard tab
   - 📁 Projects tab
   - ✓ Tasks tab
   - 💬 Chat tab
   - ⚙️ Settings tab

---

### 👤 Employee Dashboard

**Access Control:** Only employees can access the employee dashboard
**Restricted Route:** `/employee/dashboard`

#### Key Features:

1. **Task Management**
   - 📋 View all assigned tasks
   - 🔄 Update task status:
     - To Do → In Progress → Done
   - 📊 Track progress for each task (%)
   - ⏱️ View task deadlines
   - 🎯 Priority indicators (Low, Medium, High, Urgent)

2. **Task Filtering**
   - Filter tasks by status:
     - All tasks
     - To Do
     - In Progress
     - Done
   - Quick status switching

3. **Task Details & Comments**
   - 📝 View complete task information
   - 💬 **Add comments** on tasks
   - 👀 View comments from admin and other team members
   - 👤 See commenter role (Admin/Employee)
   - ⏰ Timestamp for each comment

4. **Projects View**
   - 📁 View all assigned projects
   - 📊 Project progress visualization
   - 📅 Project timeline (start & end dates)
   - 👥 Team member count
   - 🏷️ Project status badges

5. **Real-Time Chat with Admin**
   - 💬 Direct messaging with project admin
   - 📱 Single conversation interface
   - 🔔 Receive messages instantly
   - ✅ Message read status
   - 📤 Send messages and attachments

6. **Profile & Statistics**
   - 👤 Personal profile view
   - 📊 Task statistics:
     - Total assigned tasks
     - Completed tasks count
     - In-progress tasks count
     - Task completion rate (%)
     - Overdue task count

7. **Notifications**
   - 🔔 Real-time notifications for:
     - New task assignments
     - Task updates
     - Messages from admin
     - Project announcements
   - Unread notification badge

---

## 🏗️ Project Architecture

### Directory Structure

```
src/app/
├── interfaces/
│   └── models.ts              # Data models (User, Project, Task, etc.)
├── services/
│   ├── auth-service/
│   │   └── auth-service.ts    # Authentication service
│   ├── project.service.ts     # Project management service
│   ├── task.service.ts        # Task management service
│   └── chat.service.ts        # Real-time messaging service
├── pages/
│   ├── dashboard/
│   │   ├── dashboard.ts       # Admin dashboard component
│   │   ├── dashboard-new.ts   # Updated admin dashboard
│   │   └── employee-dashboard.ts # Employee dashboard component
│   ├── signin/
│   ├── registre/
│   └── ...
├── guard/
│   └── auth.guard.ts          # Route protection
└── components/
    └── layout/
```

### Data Models

#### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  avatar?: string;
  phone?: string;
  department?: string;
  createdAt: Date;
}
```

#### Project
```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  adminId: string;
  status: 'planning' | 'in-progress' | 'completed' | 'on-hold';
  startDate: Date;
  endDate: Date;
  completionPercentage: number;
  taskCount: number;
  completedTaskCount: number;
  teamMembers: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Task
```typescript
interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignedTo: string;          // Employee ID
  assignedBy: string;          // Admin ID
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline: Date;
  completionPercentage: number;
  comments: TaskComment[];
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### ChatMessage
```typescript
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'employee';
  recipientId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  conversationId: string;
}
```

---

## 🔧 Services

### ProjectService
- `createProject()` - Create new project
- `getAdminProjects()` - Get admin's projects
- `getEmployeeProjects()` - Get projects assigned to employee
- `updateProject()` - Update project details
- `deleteProject()` - Delete project
- `addEmployeeToProject()` - Add employee to team
- `updateProjectProgress()` - Calculate project completion
- `getAdminDashboardStats()` - Get dashboard statistics

### TaskService
- `createTask()` - Create and assign task
- `getProjectTasks()` - Get tasks in project
- `getEmployeeTasks()` - Get tasks assigned to employee
- `updateTask()` - Update task details
- `updateTaskStatus()` - Change task status
- `deleteTask()` - Delete task
- `addCommentToTask()` - Add comment to task
- `reassignTask()` - Reassign to different employee
- `getEmployeeDashboardStats()` - Get employee statistics

### ChatService
- `sendMessage()` - Send message between admin and employee
- `getConversationMessages()` - Get messages in conversation
- `getUserConversations()` - Get all conversations for user
- `markMessageAsRead()` - Mark message as read
- `getUnreadMessageCount()` - Count unread messages
- `getEmployeesForChat()` - Get list of employees

### AuthService
- `login()` - User authentication
- `logout()` - User logout
- `registerUser()` - Create new user account
- `currentUser$` - Observable of current user

---

## 🎨 Design System

### Color Palette
- **Primary Gradient:** `#667eea → #764ba2` (Purple/Indigo)
- **Success:** `#10b981` (Green)
- **Warning:** `#f59e0b` (Amber)
- **Danger:** `#ef4444` (Red)
- **Background:** `#f8f9fa` (Light Gray)
- **Surface:** `#ffffff` (White)
- **Text:** `#1f2937` (Dark Gray)

### Typography
- **Font Family:** Inter, Roboto, system fonts
- **Headings:** 700 weight, 20-24px
- **Body:** 400 weight, 14px
- **Labels:** 600 weight, 13-14px

### Components
- **Cards:** Soft shadows, 12px border radius
- **Buttons:** Gradient or solid, 8px border radius
- **Inputs:** 1px border, rounded corners
- **Progress Bars:** Gradient fill, 4-8px height
- **Badges:** Inline pills, small text

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Angular CLI 20
- Firebase Account

### Installation

1. **Clone Repository**
```bash
git clone https://github.com/yourusername/gestion-de-projet.git
cd GestionDeProjet
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Firebase**
```typescript
// src/environments/environment.ts
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

4. **Start Development Server**
```bash
npm start
# or
ng serve
```

5. **Open Browser**
```
http://localhost:4200
```

---

## 📊 Firebase Database Structure

```
Firestore Collections:

1. users/
   ├── uid
   ├── email
   ├── name
   ├── role (admin | employee)
   └── createdAt

2. projects/
   ├── name
   ├── description
   ├── adminId
   ├── status
   ├── startDate
   ├── endDate
   ├── completionPercentage
   ├── teamMembers[]
   └── createdAt

3. tasks/
   ├── projectId
   ├── title
   ├── description
   ├── assignedTo
   ├── assignedBy
   ├── status
   ├── priority
   ├── deadline
   ├── completionPercentage
   ├── comments[]
   └── createdAt

4. messages/
   ├── senderId
   ├── senderName
   ├── recipientId
   ├── content
   ├── timestamp
   ├── isRead
   └── conversationId

5. conversations/
   ├── adminId
   ├── employeeId
   ├── lastMessage
   ├── lastMessageTime
   └── unreadCount

6. notifications/
   ├── userId
   ├── type
   ├── title
   ├── message
   ├── isRead
   └── createdAt
```

---

## 🔐 Security & Authentication

### Route Guards
- Admin routes protected by `AuthGuard` + role verification
- Employee routes protected by `AuthGuard` + role verification
- Automatic redirect to signin for unauthorized users

### Firebase Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }
    
    // Admins can manage all projects/tasks
    // Employees can view assigned tasks
    match /tasks/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

---

## 🌐 Responsive Design

### Breakpoints
- **Desktop:** 1024px+
- **Tablet:** 768px - 1023px
- **Mobile:** < 768px

### Mobile Optimizations
- Collapsible sidebar
- Touch-friendly buttons (min 44px)
- Stack layout for cards
- Adjusted font sizes
- Single-column grids

---

## 📱 Real-Time Features

### Firebase Realtime Integration
- ✅ Instant message delivery
- ✅ Live project progress updates
- ✅ Real-time task notifications
- ✅ Status synchronization across devices
- ✅ Unread message badges

### Observable Pattern
- RxJS for data streaming
- `collectionData()` for live queries
- `takeUntilDestroyed()` for cleanup
- Signal-based state management

---

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run e2e
```

---

## 📦 Build & Deployment

### Build Production
```bash
npm run build
```

### Serve Production Build
```bash
npm run serve:ssr:GestionDeProjet
```

### Deploy to Firebase Hosting
```bash
npm install -g firebase-tools
firebase deploy
```

---

## 📝 Environment Variables

Create `.env` file:
```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

---

## 🐛 Common Issues

### Issue: Messages not displaying
- Check Firestore security rules
- Verify conversation ID format
- Clear browser cache

### Issue: Progress not updating
- Verify task status changes trigger project progress update
- Check Firestore observers are active
- Review task collection queries

### Issue: Chat not real-time
- Ensure Firebase listeners are active
- Check network connectivity
- Verify message service subscriptions

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Developer Notes

### Key Implementation Points

1. **Role-Based Access:**
   - Use `checkUserRole()` to verify admin status
   - Redirect unauthorized users
   - Show appropriate UI based on role

2. **Real-Time Updates:**
   - Subscribe to Firestore collections
   - Use unsubscribe cleanup
   - Handle loading states

3. **Performance:**
   - Lazy load project/task lists
   - Cache user preferences
   - Batch Firestore writes

4. **Error Handling:**
   - Try-catch blocks for async operations
   - User-friendly error messages
   - Console logging for debugging

---

## 📞 Support

For questions or issues, contact: support@gestionpro.dev

---

## 🙏 Acknowledgments

- Angular team for powerful framework
- Firebase for real-time capabilities
- Material Design for UI inspiration
- Open-source community

---

**Last Updated:** January 29, 2026
**Version:** 1.0.0
**Status:** Production Ready ✅
