import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef
} from '@angular/core';
import { 
  writeBatch, 
   
  serverTimestamp 
} from '@angular/fire/firestore';
import { NotificationService, Notification } from '../../services/notification.service';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import { FormsModule } from '@angular/forms';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';

/* ===== Services ONLY ===== */
import { AuthService } from '../../services/auth-service/auth-service';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { ChatService } from '../../services/chat.service';

/* ===== Models ===== */
import {
  Project,
  Task,
  User,
  EmployeeDashboardStats,
  Conversation,
  TaskComment
} from '../../interfaces/models';
import { Firestore, collection, collectionData, query, where, getDocs, addDoc, doc, setDoc, getDoc, Timestamp, orderBy, QueryDocumentSnapshot } from '@angular/fire/firestore';
import { Observable, Subscriber, catchError, of, timeout, from } from 'rxjs';

// Interface for dashboard conversations
interface DashboardConversation {
  id: string;
  adminId: string;
  employeeId: string;
  adminName: string;
  employeeName: string;
  lastMessage: string;
  lastMessageTime: Date | any;
  unreadCount: number;
}

// Interface for dashboard messages
interface DashboardMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: Date | any;
  isRead: boolean;
  conversationId: string;
}

// Extended EmployeeDashboardStats interface
interface ExtendedEmployeeDashboardStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  taskCompletionRate: number;
  activeProjects: number;
  performanceRating: string;
}

@Component({
  selector: 'app-dashboard-employee',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="dashboard-container">
      <!-- Access Denied State -->
      @if (!isEmployee()) {
        <div class="access-denied">
          <div class="denied-icon">🚫</div>
          <h1>Access Denied</h1>
          <p>This dashboard is restricted to employees only.</p>
          <p class="user-role-info">Your role: <strong>{{ userRole() }}</strong></p>
          <button class="back-btn" (click)="goBack()">Go Back to Home</button>
        </div>
      } @else {
        <!-- Sidebar -->
        <aside class="sidebar">
          <div class="sidebar-header">
            <h2 class="logo">👨‍💼 GestionPro</h2>
          </div>
          <nav class="sidebar-nav">
            <a class="nav-item" 
               [class.active]="activeTab() === 'dashboard'" 
               (click)="onTabChange('dashboard', $event)">
              <span class="icon">📈</span> Dashboard
            </a>
            
            <a class="nav-item" 
               [class.active]="activeTab() === 'tasks'" 
               (click)="onTabChange('tasks', $event)">
              <span class="icon">✓</span> My Tasks
            </a>
            
            <a class="nav-item" 
               [class.active]="activeTab() === 'projects'" 
               (click)="onTabChange('projects', $event)">
              <span class="icon">📁</span> My Projects
            </a>
            
            <a class="nav-item" 
               [class.active]="activeTab() === 'chat'" 
               (click)="onTabChange('chat', $event)">
              <span class="icon">💬</span> Chat with Admin
            </a>
            
            <a class="nav-item" 
               [class.active]="activeTab() === 'profile'" 
               (click)="onTabChange('profile', $event)">
              <span class="icon">👤</span> Profile
            </a>
          </nav>
          <div class="sidebar-footer">
            <button class="logout-btn" (click)="logout()">Logout</button>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
          <!-- Top Bar -->
          <header class="top-bar">
            <h1>{{ getTabTitle() }}</h1>
            <div class="header-right">
              <div class="notifications" (click)="toggleNotifications()">🔔
                @if (unreadNotifications() > 0) {
                  <span class="notification-badge">{{ unreadNotifications() }}</span>
                }
              </div>
              <div class="user-profile">
                <img src="https://ui-avatars.com/api/?name={{ userName() }}" alt="User">
                <div>
                  <p class="user-name">{{ userName() }}</p>
                  <p class="user-role">Employee</p>
                </div>
              </div>
            </div>
          </header>

          <!-- Notifications Panel -->
          @if (showNotifications()) {
            <div class="notifications-panel">
              <div class="notifications-header">
                <h3>Notifications</h3>
                <button class="btn-icon" (click)="clearAllNotifications()">🗑️</button>
              </div>
              <div class="notifications-list">
                @if (notifications().length > 0) {
                  @for (notification of notifications(); track notification.id) {
                    <div class="notification-item" [class.unread]="!notification.read">
                      <div class="notification-icon">
                        @if (notification.type === 'task') { 📋 }
                        @if (notification.type === 'project') { 📁 }
                        @if (notification.type === 'chat') { 💬 }
                      </div>
                      <div class="notification-content">
                        <p>{{ notification.message }}</p>
                        <small>{{ notification.timestamp | date: 'MMM dd, HH:mm' }}</small>
                      </div>
                      @if (!notification.read) {
                        <button class="btn-icon small" (click)="markAsRead(notification.id)">✓</button>
                      }
                    </div>
                  }
                } @else {
                  <div class="empty-notifications">
                    <p>No notifications</p>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Dashboard Tab -->
          @if (activeTab() === 'dashboard') {
            <section class="content">
              <!-- Stats Overview -->
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-header">
                    <span class="stat-icon">📊</span>
                    <h3>My Tasks</h3>
                  </div>
                  <p class="stat-value">{{ getDashboardStats().totalTasks }}</p>
                  <p class="stat-label">Pending: {{ getDashboardStats().totalTasks - getDashboardStats().completedTasks }}</p>
                </div>

                <div class="stat-card">
                  <div class="stat-header">
                    <span class="stat-icon">✅</span>
                    <h3>Completion Rate</h3>
                  </div>
                  <p class="stat-value">{{ getDashboardStats().taskCompletionRate.toFixed(1) }}%</p>
                  <p class="stat-label">{{ getDashboardStats().completedTasks }}/{{ getDashboardStats().totalTasks }} tasks</p>
                </div>

                <div class="stat-card">
                  <div class="stat-header">
                    <span class="stat-icon">📁</span>
                    <h3>Active Projects</h3>
                  </div>
                  <p class="stat-value">{{ getDashboardStats().activeProjects }}</p>
                  <p class="stat-label">Assigned to me</p>
                </div>

                <div class="stat-card">
                  <div class="stat-header">
                    <span class="stat-icon">⏳</span>
                    <h3>Overdue Tasks</h3>
                  </div>
                  <p class="stat-value">{{ getDashboardStats().overdueTasks }}</p>
                  <p class="stat-label">Need attention</p>
                </div>
              </div>

              <!-- Recent Tasks -->
              <div class="section">
                <div class="section-header">
                  <h2>Recent Tasks</h2>
                  <button class="btn btn-secondary" (click)="viewAllTasks()">View All</button>
                </div>
                <div class="tasks-list">
                  @if (recentTasks().length > 0) {
                    @for (task of recentTasks(); track task.id) {
                      <div class="task-card" [class.overdue]="isTaskOverdue(task)">
                        <div class="task-header">
                          <h3>{{ task.title }}</h3>
                          <div class="task-status-badges">
                            <span class="priority-badge" [class]="'priority-' + task.priority">{{ task.priority | uppercase }}</span>
                            <span class="status-badge" [class]="'status-' + task.status">{{ task.status | titlecase }}</span>
                          </div>
                        </div>
                        <p class="task-description">{{ task.description }}</p>
                        <div class="task-meta">
                          <span>📁 Project: {{ getProjectName(task.projectId) }}</span>
                          <span>📅 Deadline: {{ task.deadline | date: 'MMM dd, yyyy' }}</span>
                          @if (isTaskOverdue(task)) {
                            <span class="overdue-label">⚠️ OVERDUE</span>
                          }
                        </div>
                        <div class="progress-section">
                          <div class="progress-bar-container">
                            <div class="progress-bar" [style.width.%]="task.completionPercentage"></div>
                          </div>
                          <span>{{ task.completionPercentage }}% complete</span>
                        </div>
                        <div class="task-actions">
                          <button class="btn-small" (click)="updateTaskProgress(task)">Update Progress</button>
                          <button class="btn-small" (click)="addComment(task)">Add Comment</button>
                        </div>
                      </div>
                    }
                  } @else {
                    <div class="empty-state">
                      <p>No tasks assigned yet</p>
                    </div>
                  }
                </div>
              </div>

              <!-- My Projects -->
              <div class="section">
                <div class="section-header">
                  <h2>My Projects</h2>
                  <button class="btn btn-secondary" (click)="viewAllProjects()">View All</button>
                </div>
                <div class="projects-grid">
                  @if (myProjects().length > 0) {
                    @for (project of myProjects(); track project.id) {
                      <div class="project-card">
                        <div class="project-header">
                          <h3>{{ project.name || 'Unnamed Project' }}</h3>
                          <span class="badge" 
                                [class.status-planning]="project.status === 'planning'" 
                                [class.status-in-progress]="project.status === 'in-progress'"
                                [class.status-on-hold]="project.status === 'on-hold'"
                                [class.status-completed]="project.status === 'completed'">
                            {{ project.status || 'planning' | titlecase }}
                          </span>
                        </div>
                        <p class="project-description">{{ project.description || 'No description' }}</p>
                        <div class="project-meta">
                          <span>👤 Admin: {{ getAdminName(project.adminId) }}</span>
                          <span>👥 Team: {{ (project.teamMembers || []).length }} members</span>
                          <span>📋 Tasks: {{ getProjectTaskCount(project.id) }}</span>
                        </div>
                        <div class="progress-section">
                          <div class="progress-bar-container">
                            <div class="progress-bar" [style.width.%]="project.completionPercentage || 0"></div>
                          </div>
                          <span>{{ (project.completionPercentage || 0).toFixed(0) }}% complete</span>
                        </div>
                        <div class="project-dates">
                          <small>Start: {{ project.startDate | date: 'MMM dd, yyyy' }}</small>
                          <small>End: {{ project.endDate | date: 'MMM dd, yyyy' }}</small>
                        </div>
                        <div class="project-actions">
                          <button class="btn-small" (click)="viewProjectDetails(project)">View Details</button>
                          <button class="btn-small" (click)="chatWithAdmin(project.adminId)">Chat with Admin</button>
                        </div>
                      </div>
                    }
                  } @else {
                    <div class="empty-state">
                      <p>No projects assigned yet</p>
                    </div>
                  }
                </div>
              </div>
            </section>
          }

          <!-- Tasks Tab -->
          @if (activeTab() === 'tasks') {
            <section class="content">
              <div class="section-header">
                <h2>My Tasks</h2>
                <div class="filter-controls">
                  <select class="input" [(ngModel)]="taskFilter" (change)="filterTasks()">
                    <option value="all">All Tasks</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="overdue">Overdue</option>
                    <option value="high">High Priority</option>
                  </select>
                  <select class="input" [(ngModel)]="taskSort" (change)="sortTasks()">
                    <option value="deadline">Sort by Deadline</option>
                    <option value="priority">Sort by Priority</option>
                    <option value="status">Sort by Status</option>
                    <option value="project">Sort by Project</option>
                  </select>
                </div>
              </div>

              <div class="tasks-list">
                @if (filteredTasks().length > 0) {
                  @for (task of filteredTasks(); track task.id) {
                    <div class="task-card" [class.overdue]="isTaskOverdue(task)">
                      <div class="task-header">
                        <h3>{{ task.title }}</h3>
                        <div class="task-status-badges">
                          <span class="priority-badge" [class]="'priority-' + task.priority">{{ task.priority | uppercase }}</span>
                          <span class="status-badge" [class]="'status-' + task.status">{{ task.status | titlecase }}</span>
                        </div>
                      </div>
                      <p class="task-description">{{ task.description }}</p>
                      <div class="task-meta">
                        <span>📁 Project: {{ getProjectName(task.projectId) }}</span>
                        <span>👤 Assigned by: {{ getAdminName(task.assignedBy) }}</span>
                        <span>📅 Deadline: {{ task.deadline | date: 'MMM dd, yyyy' }}</span>
                        @if (isTaskOverdue(task)) {
                          <span class="overdue-label">⚠️ OVERDUE</span>
                        }
                      </div>
                      <div class="progress-section">
                        <div class="progress-controls">
                          <label>Progress: {{ task.completionPercentage }}%</label>
                          <input type="range" min="0" max="100" [value]="task.completionPercentage" 
                                 (change)="updateTaskProgressFromRange(task, $event)">
                          <button class="btn-small" (click)="updateTaskStatusToDone(task)" *ngIf="task.status !== 'done'">Mark as Done</button>
                        </div>
                        <div class="progress-bar-container">
                          <div class="progress-bar" [style.width.%]="task.completionPercentage"></div>
                        </div>
                      </div>
                      <div class="task-comments">
                        <h4>Comments ({{ (task.comments || []).length }})</h4>
                        @if (task.comments && task.comments.length > 0) {
                          @for (comment of task.comments.slice(-2); track comment.id) {
                            <div class="comment">
                              <strong>{{ comment.userName || 'Unknown' }}:</strong> {{ comment.content || '' }}
                              <small>{{ comment.createdAt | date: 'MMM dd, HH:mm' }}</small>
                            </div>
                          }
                        } @else {
                          <p class="no-comments">No comments yet</p>
                        }
                        <div class="add-comment">
                          <input type="text" placeholder="Add a comment..." #newComment>
                          <button class="btn-small" (click)="addCommentToTask(task, newComment)">Add</button>
                        </div>
                      </div>
                      <div class="task-actions">
                        <button class="btn-small" (click)="viewTaskDetails(task)">View Details</button>
                        <button class="btn-small" (click)="chatAboutTask(task)">Chat about Task</button>
                      </div>
                    </div>
                  }
                } @else {
                  <div class="empty-state">
                    <p>No tasks found with current filter</p>
                  </div>
                }
              </div>
            </section>
          }

          <!-- Projects Tab -->
          @if (activeTab() === 'projects') {
            <section class="content">
              <div class="section-header">
                <h2>My Projects</h2>
                <div class="filter-controls">
                  <select class="input" [(ngModel)]="projectFilter" (change)="filterProjects()">
                    <option value="all">All Projects</option>
                    <option value="active">Active</option>
                    <option value="planning">Planning</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div class="projects-grid">
                @if (filteredProjects().length > 0) {
                  @for (project of filteredProjects(); track project.id) {
                    <div class="project-card">
                      <div class="project-header">
                        <h3>{{ project.name || 'Unnamed Project' }}</h3>
                        <span class="badge" 
                              [class.status-planning]="project.status === 'planning'" 
                              [class.status-in-progress]="project.status === 'in-progress'"
                              [class.status-on-hold]="project.status === 'on-hold'"
                              [class.status-completed]="project.status === 'completed'">
                          {{ project.status || 'planning' | titlecase }}
                        </span>
                      </div>
                      <p class="project-description">{{ project.description || 'No description' }}</p>
                      <div class="project-stats">
                        <div class="stat">
                          <span class="stat-label">Tasks</span>
                          <span class="stat-value">{{ getProjectTaskCount(project.id) }}</span>
                        </div>
                        <div class="stat">
                          <span class="stat-label">My Tasks</span>
                          <span class="stat-value">{{ getMyTasksInProject(project.id).length }}</span>
                        </div>
                        <div class="stat">
                          <span class="stat-label">Completion</span>
                          <span class="stat-value">{{ (project.completionPercentage || 0).toFixed(0) }}%</span>
                        </div>
                      </div>
                      <div class="progress-section">
                        <div class="progress-bar-container">
                          <div class="progress-bar" [style.width.%]="project.completionPercentage || 0"></div>
                        </div>
                      </div>
                      <div class="project-team">
                        <h4>Team Members</h4>
                        <div class="team-avatars">
                          @for (member of (project.teamMembers || []); track member) {
                            <img [src]="'https://ui-avatars.com/api/?name=' + getMemberName(member)" 
                                 [alt]="getMemberName(member)" class="team-avatar">
                          }
                        </div>
                      </div>
                      <div class="project-dates">
                        <small>Start: {{ project.startDate | date: 'MMM dd, yyyy' }}</small>
                        <small>End: {{ project.endDate | date: 'MMM dd, yyyy' }}</small>
                      </div>
                      <div class="project-actions">
                        <button class="btn-small" (click)="viewProjectDetails(project)">View Details</button>
                        <button class="btn-small" (click)="viewProjectTasks(project)">View Tasks</button>
                        <button class="btn-small" (click)="chatWithAdmin(project.adminId)">Chat</button>
                      </div>
                    </div>
                  }
                } @else {
                  <div class="empty-state">
                    <p>No projects found with current filter</p>
                  </div>
                }
              </div>
            </section>
          }

          <!-- Chat Tab -->
          @if (activeTab() === 'chat') {
            <section class="content">
              <div class="section-header">
                <h2>Chat with Administrators</h2>
                <button class="btn btn-primary" (click)="startNewChat()" *ngIf="admins().length > 0">+ New Chat</button>
              </div>

              <div class="chat-container">
                <div class="chat-sidebar">
                  <h3>Administrators</h3>
                  <div class="admins-list">
                    @if (admins().length > 0) {
                      @for (admin of admins(); track admin.id) {
                        <div class="admin-item" 
                             [class.active]="selectedAdmin()?.id === admin.id"
                             (click)="selectAdmin(admin, $event)">
                          <div class="admin-avatar">
                            <img [src]="'https://ui-avatars.com/api/?name=' + admin.name" alt="Admin">
                          </div>
                          <div class="admin-info">
                            <h4>{{ admin.name }}</h4>
                            <p class="admin-email">{{ admin.email }}</p>
                          </div>
                          @if (getUnreadCount(admin.id) > 0) {
                            <span class="unread-badge">{{ getUnreadCount(admin.id) }}</span>
                          }
                        </div>
                      }
                    } @else {
                      <div class="empty-admins">
                        <p>No administrators available</p>
                      </div>
                    }
                  </div>
                  
                  <h3>Recent Chats</h3>
                  <div class="conversations-list">
                    @if (conversations().length > 0) {
                      @for (conv of conversations(); track conv.id) {
                        <div class="conversation-item" 
                             [class.active]="selectedConversation()?.id === conv.id"
                             (click)="selectConversation(conv, $event)">
                          <div class="conv-avatar">
                            <img [src]="'https://ui-avatars.com/api/?name=' + conv.adminName" alt="Admin">
                          </div>
                          <div class="conv-info">
                            <h4>{{ conv.adminName }}</h4>
                            <p class="conv-preview">{{ conv.lastMessage }}</p>
                          </div>
                          @if (conv.unreadCount > 0) {
                            <span class="unread-badge">{{ conv.unreadCount }}</span>
                          }
                        </div>
                      }
                    } @else {
                      <div class="empty-conversations">
                        <p>No conversations yet</p>
                      </div>
                    }
                  </div>
                </div>

                <div class="chat-main">
                  @if (selectedConversation() || selectedAdmin()) {
                    <div class="chat-header">
                      <h3>Chat with {{ selectedAdmin()?.name || selectedConversation()?.adminName || 'Administrator' }}</h3>
                      <button class="btn-icon" (click)="clearChat()">🗑️</button>
                    </div>
                    <div class="messages-container">
                      @if (chatMessages().length > 0) {
                        @for (msg of chatMessages(); track msg.id) {
                          <div class="message" [class.sent]="msg.senderId === currentUserId()">
                            <div class="message-bubble">
                              <p>{{ msg.content }}</p>
                              <small>{{ msg.timestamp | date: 'HH:mm' }}</small>
                            </div>
                          </div>
                        }
                      } @else {
                        <div class="no-messages">
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      }
                    </div>
                    <div class="chat-input-area">
                      <input type="text" 
                             placeholder="Type your message..." 
                             [(ngModel)]="chatMessage"
                             (keydown.enter)="sendChatMessage()"
                             class="chat-input">
                      <button class="btn-icon" (click)="sendChatMessage()">📤</button>
                    </div>
                  } @else {
                    <div class="no-conversation">
                      <p>Select an administrator or conversation to start chatting</p>
                    </div>
                  }
                </div>
              </div>
            </section>
          }

          <!-- Profile Tab -->
          @if (activeTab() === 'profile') {
            <section class="content">
              <div class="profile-container">
                <div class="profile-header">
                  <img [src]="'https://ui-avatars.com/api/?name=' + userName() + '&size=120'" 
                       alt="Profile" class="profile-avatar">
                  <div class="profile-info">
                    <h2>{{ userName() }}</h2>
                    <p class="profile-role">Employee</p>
                    <p class="profile-email">{{ userEmail() }}</p>
                    <p class="profile-id">ID: {{ currentUserId() }}</p>
                  </div>
                  <button class="btn btn-primary" (click)="editProfile()">Edit Profile</button>
                </div>

                <div class="profile-stats">
                  <div class="stat-card">
                    <span class="stat-icon">📋</span>
                    <span class="stat-value">{{ getDashboardStats().totalTasks }}</span>
                    <span class="stat-label">Total Tasks</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-icon">✅</span>
                    <span class="stat-value">{{ getDashboardStats().completedTasks }}</span>
                    <span class="stat-label">Completed</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-icon">📁</span>
                    <span class="stat-value">{{ getDashboardStats().activeProjects }}</span>
                    <span class="stat-label">Projects</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-icon">⭐</span>
                    <span class="stat-value">{{ getDashboardStats().performanceRating }}</span>
                    <span class="stat-label">Performance</span>
                  </div>
                </div>

                <div class="profile-details">
                  <div class="detail-section">
                    <h3>Personal Information</h3>
                    <div class="detail-row">
                      <span class="detail-label">Full Name:</span>
                      <span class="detail-value">{{ userName() }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Email:</span>
                      <span class="detail-value">{{ userEmail() }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Employee ID:</span>
                      <span class="detail-value">{{ currentUserId().substring(0, 8) }}...</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Role:</span>
                      <span class="detail-value badge status-in-progress">Employee</span>
                    </div>
                  </div>

                  <div class="detail-section">
                    <h3>Work Information</h3>
                    <div class="detail-row">
                      <span class="detail-label">Department:</span>
                      <span class="detail-value">{{ employeeInfo()?.department || 'Not specified' }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Position:</span>
                      <span class="detail-value">{{ employeeInfo()?.position || 'Employee' }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Join Date:</span>
                      <span class="detail-value">{{ employeeInfo()?.joinDate | date: 'MMM dd, yyyy' }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Status:</span>
                      <span class="detail-value badge status-active">Active</span>
                    </div>
                  </div>
                </div>

                <div class="profile-actions">
                  <button class="btn btn-secondary" (click)="changePassword()">Change Password</button>
                  <button class="btn btn-secondary" (click)="updateSkills()">Update Skills</button>
                  <button class="btn btn-secondary" (click)="viewReports()">View Reports</button>
                  <button class="btn btn-danger" (click)="requestAccountDeletion()">Request Account Deletion</button>
                </div>
              </div>
            </section>
          }
        </main>
      }
    </div>
  `,
  styles: `
    .dashboard-container {
      display: flex;
      height: 100vh;
      background-color: #f8f9fa;
      font-family: 'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .access-denied {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 20px;
      text-align: center;
    }

    .denied-icon {
      font-size: 80px;
    }

    .user-role-info {
      font-size: 16px;
      margin: 10px 0;
      background: rgba(255, 255, 255, 0.2);
      padding: 10px 20px;
      border-radius: 8px;
    }

    .back-btn {
      padding: 12px 24px;
      background: white;
      color: #10b981;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
    }

    .back-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }

    /* Sidebar */
    .sidebar {
      width: 260px;
      background: white;
      border-right: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .sidebar-header {
      margin-bottom: 30px;
    }

    .logo {
      font-size: 22px;
      font-weight: 700;
      color: #10b981;
      margin: 0;
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      color: #6b7280;
      text-decoration: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      font-weight: 500;
    }

    .nav-item:hover,
    .nav-item.active {
      background: #f0f9ff;
      color: #10b981;
    }

    .nav-item:hover {
      text-decoration: none;
    }

    .nav-item .icon {
      font-size: 18px;
    }

    .sidebar-footer {
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }

    .logout-btn {
      width: 100%;
      padding: 12px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
    }

    .logout-btn:hover {
      background: #dc2626;
      transform: translateY(-2px);
    }

    /* Main Content */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    /* Top Bar */
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 30px;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      z-index: 10;
    }

    .top-bar h1 {
      margin: 0;
      color: #1f2937;
      font-size: 24px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .notifications {
      font-size: 20px;
      cursor: pointer;
      position: relative;
    }

    .notification-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      background: #ef4444;
      color: white;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-profile img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }

    .user-name {
      margin: 0;
      font-weight: 600;
      color: #1f2937;
      font-size: 14px;
    }

    .user-role {
      margin: 0;
      color: #6b7280;
      font-size: 12px;
    }

    /* Notifications Panel */
    .notifications-panel {
      position: absolute;
      top: 80px;
      right: 30px;
      width: 350px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      border: 1px solid #e5e7eb;
    }

    .notifications-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e5e7eb;
    }

    .notifications-header h3 {
      margin: 0;
      font-size: 16px;
      color: #1f2937;
    }

    .notifications-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      padding: 12px 20px;
      border-bottom: 1px solid #f3f4f6;
      transition: all 0.3s;
    }

    .notification-item:hover {
      background: #f9fafb;
    }

    .notification-item.unread {
      background: #f0f9ff;
    }

    .notification-icon {
      font-size: 20px;
      margin-right: 12px;
      margin-top: 2px;
    }

    .notification-content {
      flex: 1;
    }

    .notification-content p {
      margin: 0 0 4px 0;
      color: #1f2937;
      font-size: 14px;
    }

    .notification-content small {
      color: #9ca3af;
      font-size: 12px;
    }

    .empty-notifications {
      padding: 30px;
      text-align: center;
      color: #9ca3af;
    }

    /* Content Area */
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 30px;
    }

    .section {
      margin-bottom: 40px;
    }

    .section h2 {
      color: #1f2937;
      margin-bottom: 20px;
      font-size: 20px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .filter-controls {
      display: flex;
      gap: 10px;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .stat-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      transition: all 0.3s;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }

    .stat-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat-icon {
      font-size: 28px;
    }

    .stat-header h3 {
      margin: 0;
      color: #6b7280;
      font-size: 14px;
      font-weight: 500;
    }

    .stat-value {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      color: #1f2937;
    }

    .stat-label {
      margin: 8px 0 0;
      color: #9ca3af;
      font-size: 13px;
    }

    /* Tasks List */
    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .task-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      transition: all 0.3s;
    }

    .task-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }

    .task-card.overdue {
      border-left: 4px solid #ef4444;
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .task-header h3 {
      margin: 0;
      color: #1f2937;
      font-size: 16px;
      flex: 1;
    }

    .task-status-badges {
      display: flex;
      gap: 8px;
    }

    .task-description {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 16px;
    }

    .task-meta {
      display: flex;
      gap: 16px;
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .overdue-label {
      color: #ef4444;
      font-weight: bold;
    }

    .progress-section {
      margin-bottom: 16px;
    }

    .progress-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .progress-controls label {
      font-size: 13px;
      color: #6b7280;
    }

    .progress-controls input[type="range"] {
      flex: 1;
    }

    .progress-bar-container {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #059669 100%);
      transition: width 0.3s ease;
    }

    .task-comments {
      margin-bottom: 16px;
      padding-top: 16px;
      border-top: 1px solid #f3f4f6;
    }

    .task-comments h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #1f2937;
    }

    .comment {
      background: #f9fafb;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 8px;
    }

    .comment strong {
      color: #1f2937;
    }

    .comment small {
      display: block;
      color: #9ca3af;
      font-size: 11px;
      margin-top: 2px;
    }

    .no-comments {
      color: #9ca3af;
      font-style: italic;
      font-size: 13px;
      margin-bottom: 12px;
    }

    .add-comment {
      display: flex;
      gap: 8px;
    }

    .add-comment input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 13px;
    }

    .task-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Projects Grid */
    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
    }

    .project-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      transition: all 0.3s;
    }

    .project-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }

    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .project-header h3 {
      margin: 0;
      color: #1f2937;
      font-size: 16px;
      flex: 1;
    }

    .badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-planning {
      background: #dbeafe;
      color: #0369a1;
    }

    .status-in-progress {
      background: #fed7aa;
      color: #b45309;
    }

    .status-on-hold {
      background: #f3f4f6;
      color: #6b7280;
    }

    .status-completed {
      background: #dcfce7;
      color: #166534;
    }

    .status-active {
      background: #dcfce7;
      color: #166534;
    }

    .project-description {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 16px;
    }

    .project-meta {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
      font-size: 13px;
      color: #6b7280;
      flex-wrap: wrap;
    }

    .project-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat {
      text-align: center;
      padding: 8px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .stat-label {
      display: block;
      color: #6b7280;
      font-size: 11px;
      margin-bottom: 4px;
    }

    .stat-value {
      display: block;
      font-weight: 700;
      color: #1f2937;
      font-size: 16px;
    }

    .project-team {
      margin-bottom: 16px;
    }

    .project-team h4 {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: #1f2937;
    }

    .team-avatars {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .team-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
    }

    .project-dates {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
      font-size: 12px;
      color: #6b7280;
    }

    .project-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    /* Priority & Status Badges */
    .priority-badge {
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }

    .priority-low {
      background: #dbeafe;
      color: #0369a1;
    }

    .priority-medium {
      background: #fed7aa;
      color: #b45309;
    }

    .priority-high {
      background: #fed7aa;
      color: #ea580c;
    }

    .priority-urgent {
      background: #fecaca;
      color: #991b1b;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }

    .status-todo {
      background: #f3f4f6;
      color: #6b7280;
    }

    .status-in-progress {
      background: #fef3c7;
      color: #92400e;
    }

    .status-done {
      background: #dcfce7;
      color: #166534;
    }

    /* Buttons */
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
      font-size: 14px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(16, 185, 129, 0.4);
    }

    .btn-secondary {
      background: #e5e7eb;
      color: #1f2937;
    }

    .btn-secondary:hover {
      background: #d1d5db;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }

    .btn-small {
      padding: 8px 16px;
      background: #f3f4f6;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.3s;
    }

    .btn-small:hover {
      background: #e5e7eb;
    }

    .btn-icon {
      width: 36px;
      height: 36px;
      border: none;
      background: #f3f4f6;
      border-radius: 6px;
      cursor: pointer;
      font-size: 18px;
      transition: all 0.3s;
    }

    .btn-icon:hover {
      background: #e5e7eb;
    }

    .btn-icon.small {
      width: 28px;
      height: 28px;
      font-size: 14px;
    }

    /* Inputs */
    .input {
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      transition: all 0.3s;
    }

    .input:focus {
      outline: none;
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
    }

    /* Chat Styles */
    .chat-container {
      display: flex;
      gap: 20px;
      height: 600px;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .chat-sidebar {
      width: 300px;
      border-right: 1px solid #e5e7eb;
      padding: 20px;
      overflow-y: auto;
    }

    .chat-sidebar h3 {
      margin: 0 0 16px;
      color: #1f2937;
      font-size: 16px;
    }

    .admins-list, .conversations-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 24px;
    }

    .admin-item, .conversation-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;
    }

    .admin-item:hover, .conversation-item:hover {
      background: #f9fafb;
    }

    .admin-item.active, .conversation-item.active {
      background: #f0f9ff;
    }

    .admin-avatar, .conv-avatar {
      flex-shrink: 0;
    }

    .admin-avatar img, .conv-avatar img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }

    .admin-info, .conv-info {
      flex: 1;
      min-width: 0;
    }

    .admin-info h4, .conv-info h4 {
      margin: 0;
      color: #1f2937;
      font-size: 14px;
      font-weight: 600;
    }

    .admin-email {
      margin: 2px 0 0;
      color: #9ca3af;
      font-size: 12px;
    }

    .conv-preview {
      margin: 4px 0 0;
      color: #9ca3af;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .unread-badge {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: #10b981;
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
    }

    .empty-admins, .empty-conversations {
      text-align: center;
      padding: 20px;
      color: #9ca3af;
    }

    .chat-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 20px;
    }

    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 16px;
    }

    .chat-header h3 {
      margin: 0;
      color: #1f2937;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .message {
      display: flex;
      justify-content: flex-start;
    }

    .message.sent {
      justify-content: flex-end;
    }

    .message-bubble {
      max-width: 70%;
      padding: 12px 16px;
      border-radius: 12px;
      background: #f3f4f6;
      color: #1f2937;
    }

    .message.sent .message-bubble {
      background: #10b981;
      color: white;
    }

    .message-bubble p {
      margin: 0;
      font-size: 14px;
    }

    .message-bubble small {
      display: block;
      margin-top: 4px;
      opacity: 0.7;
      font-size: 12px;
    }

    .chat-input-area {
      display: flex;
      gap: 12px;
      margin-top: auto;
    }

    .chat-input {
      flex: 1;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
    }

    .no-conversation {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #9ca3af;
    }

    .no-messages {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #9ca3af;
      font-style: italic;
    }

    /* Profile Styles */
    .profile-container {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .profile-header {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 40px;
    }

    .profile-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: 4px solid #f0f9ff;
    }

    .profile-info {
      flex: 1;
    }

    .profile-info h2 {
      margin: 0 0 8px 0;
      color: #1f2937;
      font-size: 28px;
    }

    .profile-role {
      margin: 0 0 4px 0;
      color: #10b981;
      font-weight: 600;
      font-size: 16px;
    }

    .profile-email {
      margin: 0 0 4px 0;
      color: #6b7280;
      font-size: 14px;
    }

    .profile-id {
      margin: 0;
      color: #9ca3af;
      font-size: 12px;
    }

    .profile-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .profile-stats .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 20px;
    }

    .profile-stats .stat-icon {
      font-size: 32px;
      margin-bottom: 12px;
    }

    .profile-stats .stat-value {
      font-size: 28px;
      margin-bottom: 4px;
    }

    .profile-stats .stat-label {
      color: #6b7280;
      font-size: 14px;
    }

    .profile-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      margin-bottom: 40px;
    }

    .detail-section h3 {
      margin: 0 0 20px 0;
      color: #1f2937;
      font-size: 18px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .detail-label {
      color: #6b7280;
      font-weight: 500;
    }

    .detail-value {
      color: #1f2937;
    }

    .profile-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* Empty States */
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px;
      color: #9ca3af;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    @media (max-width: 768px) {
      .dashboard-container {
        flex-direction: column;
      }

      .sidebar {
        width: 100%;
        flex-direction: row;
        align-items: center;
        border-right: none;
        border-bottom: 1px solid #e5e7eb;
      }

      .sidebar-nav {
        flex-direction: row;
        flex: 1;
        margin: 0 30px;
        overflow-x: auto;
      }

      .sidebar-nav .nav-item {
        white-space: nowrap;
      }

      .projects-grid {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .chat-container {
        flex-direction: column;
        height: auto;
      }

      .chat-sidebar {
        width: 100%;
        max-height: 250px;
      }

      .profile-header {
        flex-direction: column;
        text-align: center;
      }

      .profile-actions {
        justify-content: center;
      }

      .notifications-panel {
        right: 10px;
        left: 10px;
        width: auto;
      }
    }
  `
})
export class DashboardEmployeeComponent implements OnInit {
 private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private chatService = inject(ChatService);
  private firestore = inject(Firestore);
  private auth = inject(Auth); // Add this line
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  // Signals
  isEmployee = signal(false);
  userRole = signal('');
  userName = signal('');
  userEmail = signal('');
  currentUserId = signal('');

  projects = signal<Project[]>([]);
  tasks = signal<Task[]>([]);
  employees = signal<User[]>([]);
  admins = signal<User[]>([]);
  conversations = signal<DashboardConversation[]>([]);
  chatMessages = signal<DashboardMessage[]>([]);
  notifications = signal<any[]>([]);

  dashboardStats = signal<ExtendedEmployeeDashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    taskCompletionRate: 0,
    activeProjects: 0,
    performanceRating: '0.0'
  });
  
  employeeInfo = signal<any>(null);

  activeTab = signal<'dashboard' | 'projects' | 'tasks' | 'chat' | 'profile'>('dashboard');
  showNotifications = signal(false);
  selectedConversation = signal<DashboardConversation | null>(null);
  selectedAdmin = signal<User | null>(null);
  chatMessage = '';

  // Filtering and sorting
  taskFilter = 'all';
  taskSort = 'deadline';
  projectFilter = 'all';

  // Computed signals
  recentTasks = computed(() => {
    return this.tasks()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  });

  myProjects = computed(() => {
    const currentUserId = this.currentUserId();
    return this.projects().filter(project => 
      (project.teamMembers || []).includes(currentUserId) || 
      project.adminId === currentUserId
    );
  });

  filteredTasks = computed(() => {
    let tasks = this.tasks();
    
    // Apply filter
    switch (this.taskFilter) {
      case 'todo':
        tasks = tasks.filter(task => task.status === 'todo');
        break;
      case 'in-progress':
        tasks = tasks.filter(task => task.status === 'in-progress');
        break;
      case 'done':
        tasks = tasks.filter(task => task.status === 'done');
        break;
      case 'overdue':
        tasks = tasks.filter(task => this.isTaskOverdue(task));
        break;
      case 'high':
        tasks = tasks.filter(task => task.priority === 'high' || task.priority === 'urgent');
        break;
    }
    
    // Apply sorting
    switch (this.taskSort) {
      case 'deadline':
        tasks.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        break;
      case 'priority':
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        tasks.sort((a, b) => (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) - 
                            (priorityOrder[b.priority as keyof typeof priorityOrder] || 4));
        break;
      case 'status':
        const statusOrder = { todo: 0, 'in-progress': 1, done: 2 };
        tasks.sort((a, b) => (statusOrder[a.status as keyof typeof statusOrder] || 3) - 
                            (statusOrder[b.status as keyof typeof statusOrder] || 3));
        break;
      case 'project':
        tasks.sort((a, b) => this.getProjectName(a.projectId).localeCompare(this.getProjectName(b.projectId)));
        break;
    }
    
    return tasks;
  });

  filteredProjects = computed(() => {
    let projects = this.myProjects();
    
    // Apply filter
    switch (this.projectFilter) {
      case 'active':
        projects = projects.filter(project => project.status === 'in-progress');
        break;
      case 'planning':
        projects = projects.filter(project => project.status === 'planning');
        break;
      case 'completed':
        projects = projects.filter(project => project.status === 'completed');
        break;
      case 'on-hold':
        projects = projects.filter(project => project.status === 'on-hold');
        break;
    }
    
    return projects;
  });

  unreadNotifications = computed(() => {
    return this.notifications().filter(n => !n.read).length;
  });

  ngOnInit() {
    console.log('🚀 Employee Dashboard initialized');
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserId.set(user.uid);
      this.userName.set(user.displayName || user.email || 'Employee');
      this.userEmail.set(user.email || '');
      console.log('👤 Employee loaded:', user.email, 'UID:', user.uid);
      this.checkUserRole();
    } else {
      console.warn('No user found, redirecting to signin');
      this.router.navigate(['/signin']);
    }

    this.loadNotifications();
  }

  getDashboardStats(): ExtendedEmployeeDashboardStats {
    return this.dashboardStats();
  }

  checkUserRole() {
    const userId = this.currentUserId();
    if (userId) {
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('uid', '==', userId));

      getDocs(q).then((snap) => {
        if (snap.docs.length > 0) {
          const user = snap.docs[0].data();
          const role = user['role'] || '';
          this.isEmployee.set(role === 'employee');
          this.userRole.set(role);
          console.log('🎯 User role:', role, 'Is employee:', this.isEmployee());

          if (this.isEmployee()) {
            this.loadEmployeeDashboard();
            this.loadEmployeeInfo(userId);
          } else {
            console.warn('User is not employee, redirecting to admin dashboard');
            this.router.navigate(['/dashboard/admin']);
          }
        } else {
          console.warn('No user document found in Firestore');
          this.router.navigate(['/signin']);
        }
      }).catch((error: any) => {
        console.error('Error checking user role:', error);
      });
    }
  }

  loadEmployeeDashboard() {
    const employeeId = this.currentUserId();
    console.log('📊 Loading employee dashboard for:', employeeId);

    if (!employeeId) {
      console.error('❌ No employee ID available');
      return;
    }

    // Load projects
    this.loadEmployeeProjects(employeeId);

    // Load tasks
    this.loadEmployeeTasks(employeeId);

    // Load admins
    this.loadAdmins();

    // Load conversations
    this.loadConversations(employeeId);

    // Update dashboard stats
    this.updateDashboardStats();
  }

  loadEmployeeProjects(employeeId: string) {
    console.log('🔄 Loading projects for employee:', employeeId);
    
    if (!employeeId) {
      console.error('❌ No employee ID found');
      return;
    }

    try {
      this.projectService.getEmployeeProjects(employeeId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (projects) => {
            console.log('📥 Projects loaded successfully:', projects.length);
            this.projects.set(projects);
            this.updateDashboardStats();
          },
          error: (error: any) => {
            console.error('❌ Error loading projects:', error);
          }
        });
    } catch (error: any) {
      console.error('❌ Exception in loadEmployeeProjects:', error);
    }
  }

  loadEmployeeTasks(employeeId: string) {
    console.log('📋 Loading tasks for employee:', employeeId);
    
    if (!employeeId) {
      console.error('❌ No employee ID found');
      return;
    }

    try {
      this.taskService.getEmployeeTasks(employeeId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (tasks) => {
            console.log('📥 Tasks loaded successfully:', tasks.length);
            // Make sure tasks are properly formatted
            const formattedTasks = tasks.map(task => ({
              ...task,
              deadline: this.formatDate(task.deadline),
              createdAt: this.formatDate(task.createdAt),
              updatedAt: this.formatDate(task.updatedAt)
            }));
            this.tasks.set(formattedTasks);
            this.updateDashboardStats();
          },
          error: (error: any) => {
            console.error('❌ Error loading tasks:', error);
            // Try an alternative approach if the service fails
            this.loadTasksDirectly(employeeId);
          }
        });
    } catch (error: any) {
      console.error('❌ Exception in loadEmployeeTasks:', error);
      this.loadTasksDirectly(employeeId);
    }
  }

  // Add a helper method to format dates
  private formatDate(dateValue: any): Date {
    if (!dateValue) return new Date();
    
    // If it's a Firestore Timestamp
    if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
      return dateValue.toDate();
    }
    
    // If it's already a Date
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    
    // Default fallback
    return new Date();
  }
   private loadTasksDirectly(employeeId: string) {
    console.log('🔄 Loading tasks directly for employee:', employeeId);
    
    try {
      const tasksRef = collection(this.firestore, 'tasks');
      const q = query(tasksRef, where('assignedTo', '==', employeeId), orderBy('deadline', 'asc'));
      
      from(getDocs(q))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (snapshot) => {
            const tasks: Task[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
              const data = doc.data();
              return {
                id: doc.id,
                projectId: data['projectId'] || '',
                title: data['title'] || '',
                description: data['description'] || '',
                assignedTo: data['assignedTo'] || '',
                assignedBy: data['assignedBy'] || '',
                deadline: this.formatDate(data['deadline']),
                priority: data['priority'] || 'medium',
                status: data['status'] || 'todo',
                completionPercentage: data['completionPercentage'] || 0,
                comments: data['comments'] || [],
                createdAt: this.formatDate(data['createdAt']),
                updatedAt: this.formatDate(data['updatedAt'])
              };
            });
            
            console.log('📥 Tasks loaded directly:', tasks.length);
            this.tasks.set(tasks);
            this.updateDashboardStats();
          },
          error: (error: any) => {
            console.error('❌ Error loading tasks directly:', error);
          }
        });
    } catch (error: any) {
      console.error('❌ Exception in loadTasksDirectly:', error);
    }
  }

  loadAdmins() {
    console.log('👑 Loading administrators...');
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('role', '==', 'admin'));
    
    getDocs(q)
      .then((querySnapshot) => {
        const admins: User[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const admin: User = {
            id: doc.id,
            email: data['email'] || '',
            name: data['name'] || '',
            role: data['role'] || 'admin',
            createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(),
          };
          admins.push(admin);
        });
        console.log('👑 Admins loaded:', admins.length);
        this.admins.set(admins);
      })
      .catch((error: any) => {
        console.error('❌ Error loading admins:', error);
      });
  }

  updateDashboardStats() {
    console.log('📈 Updating dashboard stats...');
    
    const tasks = this.tasks();
    const projects = this.myProjects();
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'done').length;
    const overdueTasks = tasks.filter(task => this.isTaskOverdue(task)).length;
    const activeProjects = projects.filter(project => project.status === 'in-progress').length;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const performanceRating = totalTasks > 0 ? Math.min(5, (completedTasks / totalTasks) * 5).toFixed(1) : '0.0';
    
    const stats: ExtendedEmployeeDashboardStats = {
      totalTasks,
      completedTasks,
      overdueTasks,
      taskCompletionRate,
      activeProjects,
      performanceRating
    };
    
    console.log('📈 Dashboard stats calculated:', stats);
    this.dashboardStats.set(stats);
  }

  loadEmployeeInfo(employeeId: string) {
    console.log('📝 Loading employee info...');
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('uid', '==', employeeId));
    
    getDocs(q)
      .then((querySnapshot) => {
        if (querySnapshot.docs.length > 0) {
          const data = querySnapshot.docs[0].data();
          this.employeeInfo.set({
            department: data['department'] || 'Not specified',
            position: data['position'] || 'Employee',
            joinDate: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(),
            skills: data['skills'] || []
          });
        }
      })
      .catch((error: any) => {
        console.error('❌ Error loading employee info:', error);
      });
  }

  loadNotifications() {
    console.log('🔔 Loading notifications...');
    // Simulate notifications for now
    const mockNotifications = [
      {
        id: '1',
        type: 'task',
        message: 'New task assigned: Complete project documentation',
        timestamp: new Date(Date.now() - 3600000),
        read: false
      },
      {
        id: '2',
        type: 'project',
        message: 'Project "Website Redesign" updated',
        timestamp: new Date(Date.now() - 7200000),
        read: true
      },
      {
        id: '3',
        type: 'chat',
        message: 'New message from Admin',
        timestamp: new Date(Date.now() - 10800000),
        read: false
      }
    ];
    
    this.notifications.set(mockNotifications);
  }

  loadConversations(employeeId: string) {
    console.log('💬 Loading conversations for employee:', employeeId);
    
    if (!employeeId) {
      console.error('❌ No employee ID provided');
      this.conversations.set([]);
      return;
    }

    try {
      const firestore = this.firestore;
      const conversationsRef = collection(firestore, 'conversations');
      const q = query(
        conversationsRef, 
        where('employeeId', '==', employeeId),
        orderBy('lastMessageTime', 'desc')
      );

      getDocs(q)
        .then((snapshot) => {
          const conversations: DashboardConversation[] = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
              id: doc.id,
              adminId: data['adminId'] || '',
              employeeId: data['employeeId'] || employeeId,
              adminName: data['adminName'] || 'Admin',
              employeeName: data['employeeName'] || this.userName(),
              lastMessage: data['lastMessage'] || 'No messages yet',
              lastMessageTime: data['lastMessageTime']?.toDate ? 
                data['lastMessageTime'].toDate() : data['lastMessageTime'],
              unreadCount: data['unreadCount'] || 0
            };
          });
          
          console.log('✅ Conversations loaded:', conversations.length);
          this.conversations.set(conversations);
        })
        .catch((error: any) => {
          console.error('❌ Error loading conversations:', error);
          this.conversations.set([]);
        });
    } catch (error: any) {
      console.error('❌ Exception in loadConversations:', error);
      this.conversations.set([]);
    }
  }

  loadMessages(userId1: string, userId2: string) {
    console.log('📨 Loading messages between', userId1, 'and', userId2);
    
    try {
      const messagesRef = collection(this.firestore, 'messages');
      
      // Generate conversation ID both ways
      const conversationId1 = `${userId1}_${userId2}`;
      const conversationId2 = `${userId2}_${userId1}`;
      
      const q = query(
        messagesRef,
        where('conversationId', 'in', [conversationId1, conversationId2]),
        orderBy('timestamp', 'asc')
      );

      from(getDocs(q))
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          catchError((error: any) => {
            console.error('❌ Error loading messages:', error);
            return of({ docs: [] } as any);
          })
        )
        .subscribe({
          next: (snapshot) => {
            const messages: DashboardMessage[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
              const data = doc.data();
              return {
                id: doc.id,
                senderId: data['senderId'] || '',
                senderName: data['senderName'] || '',
                senderRole: data['senderRole'] || 'admin',
                content: data['content'] || '',
                timestamp: data['timestamp']?.toDate ? data['timestamp'].toDate() : data['timestamp'],
                isRead: data['isRead'] || false,
                conversationId: data['conversationId'] || ''
              };
            });
            
            console.log('✅ Messages loaded:', messages.length);
            this.chatMessages.set(messages);
            
            // Auto-scroll to bottom
            setTimeout(() => {
              this.scrollToBottom();
            }, 100);
          },
          error: (error: any) => {
            console.error('❌ Subscription error in loadMessages:', error);
            this.chatMessages.set([]);
          }
        });
    } catch (error: any) {
      console.error('❌ Exception in loadMessages:', error);
      this.chatMessages.set([]);
    }
  }

  onTabChange(tab: 'dashboard' | 'projects' | 'tasks' | 'chat' | 'profile', event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('Employee tab clicked:', tab, 'Auth state:', this.authService.getCurrentUser()?.email);
    
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.warn('Employee not authenticated when switching tabs');
      return;
    }
    
    if (this.userRole() !== 'employee') {
      console.warn('User is not employee, cannot access employee dashboard');
      return;
    }
    
    this.activeTab.set(tab);
    this.showNotifications.set(false); // Hide notifications when switching tabs
    
    // Load data based on tab
    switch (tab) {
      case 'dashboard':
        this.updateDashboardStats();
        break;
      case 'projects':
        this.loadEmployeeProjects(this.currentUserId());
        break;
      case 'tasks':
        this.loadEmployeeTasks(this.currentUserId());
        break;
      case 'chat':
        this.loadConversations(this.currentUserId());
        break;
    }
  }

  // Helper Methods
  getProjectName(projectId: string): string {
    const project = this.projects().find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  }

  getAdminName(adminId: string): string {
    const admin = this.admins().find(a => a.id === adminId);
    return admin?.name || admin?.email || 'Administrator';
  }

  getMemberName(memberId: string): string {
    if (memberId === this.currentUserId()) return this.userName();
    
    const admin = this.admins().find(a => a.id === memberId);
    if (admin) return admin.name;
    
    const employee = this.employees().find(e => e.id === memberId);
    if (employee) return employee.name;
    
    return 'Unknown';
  }

  getProjectTaskCount(projectId: string): number {
    return this.tasks().filter(task => task.projectId === projectId).length;
  }

  getMyTasksInProject(projectId: string): Task[] {
    return this.tasks().filter(task => 
      task.projectId === projectId && 
      task.assignedTo === this.currentUserId()
    );
  }

  isTaskOverdue(task: Task): boolean {
    if (!task.deadline) return false;
    const deadline = new Date(task.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadline < today && task.status !== 'done';
  }

  getUnreadCount(adminId: string): number {
    const conv = this.conversations().find(c => c.adminId === adminId);
    return conv?.unreadCount || 0;
  }

  // UI Interaction Methods
  toggleNotifications() {
    this.showNotifications.update(v => !v);
  }

  markAsRead(notificationId: string) {
    this.notifications.update(notifications =>
      notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }

  clearAllNotifications() {
    this.notifications.set([]);
  }

  viewAllTasks() {
    this.activeTab.set('tasks');
  }

  viewAllProjects() {
    this.activeTab.set('projects');
  }

  updateTaskProgress(task: Task) {
    const newProgress = Math.min(100, task.completionPercentage + 10);
    
    // Update locally first for immediate feedback
    const updatedTask = { ...task, completionPercentage: newProgress };
    if (newProgress >= 100) {
      updatedTask.status = 'done';
    } else if (newProgress > 0 && task.status === 'todo') {
      updatedTask.status = 'in-progress';
    }
    
    // Update in Firestore
    this.taskService.updateTask(task.id, {
      completionPercentage: newProgress,
      status: updatedTask.status
    })
      .then(() => {
        console.log('✅ Task progress updated');
        this.loadEmployeeTasks(this.currentUserId());
      })
      .catch((error: any) => {
        console.error('❌ Error updating task progress:', error);
        alert('Error updating task: ' + error.message);
      });
  }

  updateTaskProgressFromRange(task: Task, event: any) {
    const newProgress = parseInt(event.target.value, 10);
    
    // Update locally first for immediate feedback
    const updatedTask = { ...task, completionPercentage: newProgress };
    if (newProgress >= 100) {
      updatedTask.status = 'done';
    } else if (newProgress > 0 && task.status === 'todo') {
      updatedTask.status = 'in-progress';
    }
    
    // Update in Firestore
    this.taskService.updateTask(task.id, {
      completionPercentage: newProgress,
      status: updatedTask.status
    })
      .then(() => {
        console.log('✅ Task progress updated from range');
        this.loadEmployeeTasks(this.currentUserId());
      })
      .catch((error: any) => {
        console.error('❌ Error updating task progress:', error);
      });
  }

  updateTaskStatusToDone(task: Task) {
    const updatedTask = { 
      ...task, 
      status: 'done' as const,
      completionPercentage: 100
    };
    
    this.taskService.updateTask(task.id, {
      status: 'done',
      completionPercentage: 100
    })
      .then(() => {
        console.log('✅ Task marked as done');
        this.loadEmployeeTasks(this.currentUserId());
      })
      .catch((error: any) => {
        console.error('❌ Error updating task status:', error);
        alert('Error updating task: ' + error.message);
      });
  }

  addComment(task: Task) {
    const comment = prompt('Enter your comment:');
    if (comment) {
      this.taskService.addCommentToTask(
        task.id,
        this.currentUserId(),
        this.userName(),
        'employee',
        comment
      )
        .then(() => {
          console.log('✅ Comment added');
          this.loadEmployeeTasks(this.currentUserId());
        })
        .catch((error: any) => {
          console.error('❌ Error adding comment:', error);
          alert('Error adding comment: ' + error.message);
        });
    }
  }

  addCommentToTask(task: Task, inputElement: HTMLInputElement) {
    const comment = inputElement.value.trim();
    if (comment) {
      this.taskService.addCommentToTask(
        task.id,
        this.currentUserId(),
        this.userName(),
        'employee',
        comment
      )
        .then(() => {
          console.log('✅ Comment added');
          inputElement.value = '';
          this.loadEmployeeTasks(this.currentUserId());
        })
        .catch((error: any) => {
          console.error('❌ Error adding comment:', error);
          alert('Error adding comment: ' + error.message);
        });
    }
  }

  viewTaskDetails(task: Task) {
    console.log('View task details:', task);
    alert(`Task Details:\n\nTitle: ${task.title}\nDescription: ${task.description}\nStatus: ${task.status}\nProgress: ${task.completionPercentage}%`);
  }

  viewProjectDetails(project: Project) {
    console.log('View project details:', project);
    alert(`Project Details:\n\nName: ${project.name}\nDescription: ${project.description}\nStatus: ${project.status}\nCompletion: ${project.completionPercentage || 0}%`);
  }

  viewProjectTasks(project: Project) {
    console.log('View project tasks:', project);
    this.activeTab.set('tasks');
    this.projectFilter = 'all';
    this.taskFilter = 'all';
  }

  chatWithAdmin(adminId: string) {
    console.log('Chat with admin:', adminId);
    const admin = this.admins().find(a => a.id === adminId);
    if (admin) {
      this.selectedAdmin.set(admin);
      this.selectedConversation.set(null);
      this.activeTab.set('chat');
      this.loadMessages(this.currentUserId(), adminId);
    }
  }

  chatAboutTask(task: Task) {
    console.log('Chat about task:', task);
    const adminId = task.assignedBy;
    this.chatWithAdmin(adminId);
    this.chatMessage = `Regarding task: "${task.title}" - `;
  }

  selectAdmin(admin: User, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('🎯 Selecting admin:', admin.name);
    this.selectedAdmin.set(admin);
    this.selectedConversation.set(null);
    this.loadMessages(this.currentUserId(), admin.id);
  }

  selectConversation(conv: DashboardConversation, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('🎯 Selecting conversation with:', conv.adminName);
    this.selectedConversation.set(conv);
    this.selectedAdmin.set(null);
    this.loadMessages(this.currentUserId(), conv.adminId);
  }

  startNewChat() {
    if (this.admins().length > 0) {
      this.selectAdmin(this.admins()[0]);
    }
  }

  clearChat() {
    this.chatMessages.set([]);
    this.selectedConversation.set(null);
    this.selectedAdmin.set(null);
  }

  async sendChatMessage() {
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.warn('Cannot send message: Employee not authenticated');
      return;
    }
    
    if (!this.chatMessage.trim()) {
      return;
    }
    
    const recipientId = this.selectedAdmin()?.id || this.selectedConversation()?.adminId;
    if (!recipientId) {
      alert('Please select an administrator to chat with');
      return;
    }
    
    console.log('📤 Sending message to admin:', recipientId);
    
    try {
      await this.chatService.sendMessage(
        this.currentUserId(),
        this.userName(),
        'employee',
        recipientId,
        this.chatMessage
      );
      
      this.chatMessage = '';
      
      // Reload messages after sending
      setTimeout(() => {
        this.loadMessages(this.currentUserId(), recipientId);
      }, 500);
      
    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  }

  // Profile Methods
  editProfile() {
    alert('Edit profile functionality coming soon!');
  }

    changePassword() {
    const userEmail = this.userEmail();
    const user = this.auth.currentUser;
    
    if (userEmail && user) {
      import('firebase/auth').then(({ sendPasswordResetEmail }) => {
        sendPasswordResetEmail(this.auth, userEmail)
          .then(() => {
            alert('Password reset email sent! Check your inbox.');
          })
          .catch((error: any) => {
            alert('Error sending password reset email: ' + error.message);
          });
      });
    } else {
      alert('Cannot change password: No user email found or not authenticated');
    }
  }


  updateSkills() {
    const skills = prompt('Enter your skills (comma separated):');
    if (skills) {
      // Update skills in Firestore
      const userId = this.currentUserId();
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('uid', '==', userId));
      
      getDocs(q).then((snapshot) => {
        if (snapshot.docs.length > 0) {
          const userDoc = snapshot.docs[0];
          const userRef = doc(this.firestore, 'users', userDoc.id);
          
          setDoc(userRef, {
            ...userDoc.data(),
            skills: skills.split(',').map(s => s.trim())
          }, { merge: true })
            .then(() => {
              alert('Skills updated successfully!');
            })
            .catch((error: any) => {
              alert('Error updating skills: ' + error.message);
            });
        }
      });
    }
  }

  viewReports() {
    alert('View reports functionality coming soon!');
  }

  requestAccountDeletion() {
    if (confirm('Are you sure you want to request account deletion? This will notify administrators.')) {
      alert('Account deletion request sent to administrators.');
    }
  }

  filterTasks() {
    // Signal will automatically update through computed property
    console.log('Filtering tasks by:', this.taskFilter);
  }

  sortTasks() {
    // Signal will automatically update through computed property
    console.log('Sorting tasks by:', this.taskSort);
  }

  filterProjects() {
    // Signal will automatically update through computed property
    console.log('Filtering projects by:', this.projectFilter);
  }

  getTabTitle(): string {
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      projects: 'My Projects',
      tasks: 'My Tasks',
      chat: 'Chat',
      profile: 'Profile',
    };
    return titles[this.activeTab()] || 'Dashboard';
  }

  logout() {
    console.log('👋 Logging out employee');
    this.authService.logout();
    this.router.navigate(['/signin']);
  }

  goBack() {
    this.router.navigate(['/']);
  }

  private scrollToBottom() {
    setTimeout(() => {
      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }
} 