// User Model
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  avatar?: string;
  phone?: string;
  department?: string;
  createdAt: Date;
}

// Project Model
export interface Project {
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
  teamMembers: string[]; // Array of employee IDs
  createdAt: Date;
  updatedAt: Date;
}

// Task Model
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignedTo: string; // Employee ID
  assignedBy: string; // Admin ID
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline: Date;
  completionPercentage: number;
  comments: TaskComment[];
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Task Comment Model
export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'employee';
  content: string;
  createdAt: Date;
}

// Chat Message Model
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'employee';
  recipientId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  conversationId: string; // Format: "admin_id_employee_id"
}

// Conversation Model (for chat)
export interface Conversation {
  id: string; // Format: "admin_id_employee_id"
  adminId: string;
  employeeId: string;
  adminName: string;
  employeeName: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

// Notification Model
export interface Notification {
  id: string;
  userId: string;
  type: 'task-assigned' | 'task-updated' | 'message' | 'project-update' | 'comment';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

// Dashboard Stats
export interface AdminDashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  taskCompletionRate: number;
  activeEmployees: number;
  projectProgress: ProjectProgress[];
}

export interface ProjectProgress {
  projectId: string;
  projectName: string;
  progress: number;
  tasksDone: number;
  tasksTotal: number;
  startDate: Date;
  endDate: Date;
}

export interface EmployeeDashboardStats {
  assignedTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTaskCount: number;
  taskCompletionRate: number;
}
