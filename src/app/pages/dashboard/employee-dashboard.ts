import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef
} from '@angular/core';
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
  TaskVerification,
  User,
  EmployeeDashboardStats,
  Conversation,
  TaskComment,
  TaskActivityEntry
} from '../../interfaces/models';
import { Firestore, collection, query, where, getDocs, addDoc, doc, setDoc, getDoc, Timestamp, orderBy, QueryDocumentSnapshot } from '@angular/fire/firestore';
import { Observable, Subscriber, catchError, of, timeout, from } from 'rxjs';
import Swal from 'sweetalert2';

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
          <div class="denied-icon"><span class="material-symbols-rounded app-icon">block</span></div>
          <h1>Access Denied</h1>
          <p>This dashboard is restricted to employees only.</p>
          <p class="user-role-info">Your role: <strong>{{ userRole() }}</strong></p>
          <button class="back-btn" (click)="goBack()">Go Back to Home</button>
        </div>
      } @else {
        <!-- Sidebar -->
        <aside class="sidebar">
          <div class="sidebar-header">
            <h2 class="logo"><span class="material-symbols-rounded app-icon">bolt</span> GestionPro</h2>
          </div>
          <nav class="sidebar-nav">
            <a class="nav-item" 
               [class.active]="activeTab() === 'dashboard'" 
               (click)="onTabChange('dashboard', $event)">
              <span class="icon material-symbols-rounded app-icon">dashboard</span> Dashboard
            </a>
            
            <a class="nav-item" 
               [class.active]="activeTab() === 'tasks'" 
               (click)="onTabChange('tasks', $event)">
              <span class="icon material-symbols-rounded app-icon">task_alt</span> My Tasks
            </a>
            
            <a class="nav-item" 
               [class.active]="activeTab() === 'projects'" 
               (click)="onTabChange('projects', $event)">
              <span class="icon material-symbols-rounded app-icon">folder</span> My Projects
            </a>
            
            <a class="nav-item" 
               [class.active]="activeTab() === 'chat'" 
               (click)="onTabChange('chat', $event)">
              <span class="icon material-symbols-rounded app-icon">chat</span> Chat with Admin
            </a>
            
            <a class="nav-item" 
               [class.active]="activeTab() === 'profile'" 
               (click)="onTabChange('profile', $event)">
              <span class="icon material-symbols-rounded app-icon">person</span> Profile
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
              <div class="notifications" (click)="toggleNotifications()"><span class="material-symbols-rounded app-icon">notifications</span>
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
                <button class="btn-icon" (click)="clearAllNotifications()"><span class="material-symbols-rounded app-icon">cleaning_services</span></button>
              </div>
              <div class="notifications-list">
                @if (notifications().length > 0) {
                  @for (notification of notifications(); track notification.id) {
                    <div class="notification-item" [class.unread]="!notification.read">
                      <div class="notification-icon">
                        @if (notification.type === 'task') { <span class="material-symbols-rounded app-icon">task_alt</span> }
                        @if (notification.type === 'project') { <span class="material-symbols-rounded app-icon">folder</span> }
                        @if (notification.type === 'chat') { <span class="material-symbols-rounded app-icon">chat</span> }
                        @if (notification.type === 'system') { <span class="material-symbols-rounded app-icon">warning</span> }
                      </div>
                      <div class="notification-content">
                        <p>{{ notification.message }}</p>
                        <small>{{ getNotificationDate(notification.createdAt) | date: 'MMM dd, HH:mm' }}</small>
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
                    <span class="stat-icon material-symbols-rounded app-icon">task_alt</span>
                    <h3>My Tasks</h3>
                  </div>
                  <p class="stat-value">{{ getDashboardStats().totalTasks }}</p>
                  <p class="stat-label">Pending: {{ getDashboardStats().totalTasks - getDashboardStats().completedTasks }}</p>
                </div>

                <div class="stat-card">
                  <div class="stat-header">
                    <span class="stat-icon material-symbols-rounded app-icon">trending_up</span>
                    <h3>Completion Rate</h3>
                  </div>
                  <p class="stat-value">{{ getDashboardStats().taskCompletionRate.toFixed(1) }}%</p>
                  <p class="stat-label">{{ getDashboardStats().completedTasks }}/{{ getDashboardStats().totalTasks }} tasks</p>
                </div>

                <div class="stat-card">
                  <div class="stat-header">
                    <span class="stat-icon material-symbols-rounded app-icon">folder</span>
                    <h3>Active Projects</h3>
                  </div>
                  <p class="stat-value">{{ getDashboardStats().activeProjects }}</p>
                  <p class="stat-label">Assigned to me</p>
                </div>

                <div class="stat-card">
                  <div class="stat-header">
                    <span class="stat-icon material-symbols-rounded app-icon">schedule</span>
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
                        <div class="task-headline">
                          <div class="task-title-wrap">
                            <span class="material-symbols-rounded app-icon">assignment</span>
                            <div>
                              <h3>{{ task.title }}</h3>
                              <p class="task-subtitle">Project: {{ getProjectName(task.projectId) }}</p>
                            </div>
                          </div>
                          <div class="task-status-badges">
                            <span class="priority-badge" [class]="'priority-' + task.priority">{{ task.priority | uppercase }}</span>
                            <span class="status-badge" [class]="'status-' + task.status">{{ task.status | titlecase }}</span>
                          </div>
                        </div>
                        <p class="task-description">{{ task.description }}</p>
                        <div class="task-meta">
                          <span class="meta-chip">
                            <span class="material-symbols-rounded">event</span>
                            Deadline: {{ task.deadline | date: 'MMM dd, yyyy' }}
                          </span>
                          @if (isTaskOverdue(task)) {
                            <span class="meta-chip overdue-label">
                              <span class="material-symbols-rounded">warning</span>
                              OVERDUE
                            </span>
                          }
                        </div>
                        <div class="progress-section">
                          <div class="progress-track">
                            <div class="progress-fill" [style.width.%]="task.completionPercentage"></div>
                          </div>
                          <p class="progress-subtitle">{{ task.completionPercentage }}% complete</p>
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
                        <div class="project-headline">
                          <div class="project-title-wrap">
                            <span class="material-symbols-rounded app-icon">folder</span>
                            <h3>{{ project.name || 'Unnamed Project' }}</h3>
                          </div>
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
                          <span class="meta-chip"><span class="material-symbols-rounded">manage_accounts</span>Admin: {{ getAdminName(project.adminId) }}</span>
                          <span class="meta-chip"><span class="material-symbols-rounded">groups</span>Team: {{ (project.teamMembers || []).length }} members</span>
                          <span class="meta-chip"><span class="material-symbols-rounded">task_alt</span>Tasks: {{ getProjectTaskCount(project.id) }}</span>
                        </div>
                        <div class="progress-section">
                          <div class="progress-track">
                            <div class="progress-fill" [style.width.%]="project.completionPercentage || 0"></div>
                          </div>
                          <p class="progress-subtitle">{{ (project.completionPercentage || 0).toFixed(0) }}% complete</p>
                        </div>
                        <div class="project-dates">
                          <small class="meta-chip"><span class="material-symbols-rounded">event_available</span>Start: {{ project.startDate | date: 'MMM dd, yyyy' }}</small>
                          <small class="meta-chip"><span class="material-symbols-rounded">event_busy</span>End: {{ project.endDate | date: 'MMM dd, yyyy' }}</small>
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
                  @if (selectedTaskProjectId) {
                    <button class="btn btn-secondary" (click)="clearProjectTaskScope()">
                      Project: {{ getProjectName(selectedTaskProjectId) }} ✕
                    </button>
                  }
                  <select class="input" [(ngModel)]="taskFilter" (change)="filterTasks()">
                    <option value="all">All Tasks</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="pending-approval">Pending Approval</option>
                    <option value="done">Done</option>
                    <option value="overdue">Overdue</option>
                    <option value="high">High Priority</option>
                    <option value="due-this-week">Due This Week</option>
                  </select>
                  <select class="input" [(ngModel)]="taskSort" (change)="sortTasks()">
                    <option value="deadline">Sort by Deadline</option>
                    <option value="priority">Sort by Priority</option>
                    <option value="status">Sort by Status</option>
                    <option value="project">Sort by Project</option>
                    <option value="score">Sort by Score</option>
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
                          <span>Project: {{ getProjectName(task.projectId) }}</span>
                          <span>Assigned by: {{ getAdminName(task.assignedBy) }}</span>
                          <span>Deadline: {{ task.deadline | date: 'MMM dd, yyyy' }}</span>
                        <span>Score: {{ getTaskScore(task).toFixed(2) }}</span>
                        <span>Hours: {{ task.actualHours || 0 }}/{{ task.estimatedHours || 0 }}</span>
                        @if (isTaskOverdue(task)) {
                          <span class="overdue-label">OVERDUE</span>
                        }
                      </div>
                      <div class="progress-section">
                        <div class="progress-controls">
                          <label>Progress: {{ task.completionPercentage }}%</label>
                          <input type="range" min="0" max="100" [value]="task.completionPercentage" [disabled]="isTaskLockedForReview(task) || task.status === 'done'"
                                 (change)="updateTaskProgressFromRange(task, $event)">
                          <button class="btn-small" (click)="submitTaskForReview(task)" [disabled]="isTaskLockedForReview(task) || task.status === 'done'">Submit for Review</button>
                        </div>
                        <div class="progress-bar-container">
                          <div class="progress-bar" [style.width.%]="task.completionPercentage"></div>
                        </div>
                        @if (task.status === 'pending-approval') {
                          <small class="status-note">Waiting for admin approval</small>
                        }
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
                          <input type="text" placeholder="Add a comment..." #newComment [disabled]="isTaskLockedForReview(task)">
                          <button class="btn-small" (click)="addCommentToTask(task, newComment)" [disabled]="isTaskLockedForReview(task)">Add</button>
                        </div>
                      </div>
                      <div class="task-actions">
                        <button class="btn-small" (click)="viewTaskDetails(task)">View Details</button>
                        <button class="btn-small" (click)="chatAboutTask(task)">Chat about Task</button>
                        <button class="btn-small" (click)="openTaskActivity(task.id)">Activity</button>
                        <button class="btn-small" (click)="setTaskRemindersPrompt(task)" [disabled]="isTaskLockedForReview(task)">Reminders</button>
                        <button class="btn-small" (click)="logOneHour(task.id)" [disabled]="isTaskLockedForReview(task)">+1h</button>
                      </div>
                    </div>
                  }
                } @else {
                  <div class="empty-state">
                    <p>No tasks found with current filter</p>
                  </div>
                }
              </div>

              @if (selectedActivityTaskId()) {
                <div class="form-card activity-card">
                  <h3>Task Activity ({{ selectedActivityTaskId() }})</h3>
                  @if (taskActivities().length > 0) {
                    <div class="notifications-list">
                      @for (entry of taskActivities(); track entry.id) {
                        <div class="notification-item">
                          <div class="notification-content">
                            <p><strong>{{ entry.action }}</strong> by {{ entry.actorName }} ({{ entry.actorRole }})</p>
                            <small>{{ entry.createdAt | date: 'MMM dd, yyyy HH:mm' }}</small>
                          </div>
                        </div>
                      }
                    </div>
                  } @else {
                    <p>No activity yet for this task.</p>
                  }
                </div>
              }
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
                            <small class="conv-time">{{ conv.lastMessageTime | date: 'MMM dd, HH:mm' }}</small>
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
                      <div class="chat-title-wrap">
                        <h3>Chat with {{ selectedAdmin()?.name || selectedConversation()?.adminName || 'Administrator' }}</h3>
                        <p class="chat-subtitle">Realtime conversation</p>
                      </div>
                      <button class="btn-icon" (click)="clearChat()"><span class="material-symbols-rounded app-icon">cleaning_services</span></button>
                    </div>
                    <div class="messages-container">
                      @if (chatMessages().length > 0) {
                        @for (msg of chatMessages(); track msg.id) {
                          <div class="message" [class.sent]="msg.senderId === currentUserId()">
                            <div class="message-bubble">
                              <p>{{ msg.content }}</p>
                              <div class="message-meta">
                                <small>{{ msg.timestamp | date: 'HH:mm' }}</small>
                                @if (msg.senderId === currentUserId()) {
                                  <span class="seen-state" [class.seen]="msg.isRead">{{ msg.isRead ? 'Seen' : 'Sent' }}</span>
                                }
                              </div>
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
                      <button class="btn-icon chat-send-btn" (click)="sendChatMessage()"><span class="material-symbols-rounded app-icon">send</span></button>
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
                    <span class="stat-icon material-symbols-rounded app-icon">psychology</span>
                    <span class="stat-value">{{ getDashboardStats().totalTasks }}</span>
                    <span class="stat-label">Total Tasks</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-icon material-symbols-rounded app-icon">task_alt</span>
                    <span class="stat-value">{{ getDashboardStats().completedTasks }}</span>
                    <span class="stat-label">Completed</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-icon material-symbols-rounded app-icon">folder</span>
                    <span class="stat-value">{{ getDashboardStats().activeProjects }}</span>
                    <span class="stat-label">Projects</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-icon material-symbols-rounded app-icon">star</span>
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
  styles: ``
})
export class DashboardEmployeeComponent implements OnInit {
 private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private chatService = inject(ChatService);
  private notificationService = inject(NotificationService);
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
  notifications = signal<Notification[]>([]);
  taskActivities = signal<TaskActivityEntry[]>([]);
  selectedActivityTaskId = signal<string | null>(null);

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
  selectedTaskProjectId: string | null = null;

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

    if (this.selectedTaskProjectId) {
      tasks = tasks.filter(task => task.projectId === this.selectedTaskProjectId);
    }
    
    // Apply filter
    switch (this.taskFilter) {
      case 'todo':
        tasks = tasks.filter(task => task.status === 'todo');
        break;
      case 'in-progress':
        tasks = tasks.filter(task => task.status === 'in-progress');
        break;
      case 'pending-approval':
        tasks = tasks.filter(task => task.status === 'pending-approval');
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
      case 'due-this-week':
        const today = new Date();
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        tasks = tasks.filter(task => {
          const deadline = new Date(task.deadline);
          return deadline >= today && deadline <= weekEnd;
        });
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
        const statusOrder = { todo: 0, 'in-progress': 1, 'pending-approval': 2, done: 3 };
        tasks.sort((a, b) => (statusOrder[a.status as keyof typeof statusOrder] || 3) - 
                            (statusOrder[b.status as keyof typeof statusOrder] || 3));
        break;
      case 'project':
        tasks.sort((a, b) => this.getProjectName(a.projectId).localeCompare(this.getProjectName(b.projectId)));
        break;
      case 'score':
        tasks.sort((a, b) => this.getTaskScore(b) - this.getTaskScore(a));
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
    console.log('Employee Dashboard initialized');
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserId.set(user.uid);
      this.userName.set(user.displayName || user.email || 'Employee');
      this.userEmail.set(user.email || '');
      console.log('Employee loaded:', user.email, 'UID:', user.uid);
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

  async checkUserRole() {
    const userId = this.currentUserId();
    if (!userId) {
      return;
    }

    try {
      const role = await this.authService.getUserRole(userId);
      this.isEmployee.set(role === 'employee');
      this.userRole.set(role);
      console.log('User role:', role, 'Is employee:', this.isEmployee());

      if (this.isEmployee()) {
        this.loadEmployeeDashboard();
        this.loadEmployeeInfo(userId);
      } else {
        console.warn('User is not employee, redirecting to admin dashboard');
        this.router.navigate(['/dashboard/admin']);
      }
    } catch (error: any) {
      console.error('Error checking user role:', error);
      this.router.navigate(['/signin']);
    }
  }

  loadEmployeeDashboard() {
    const employeeId = this.currentUserId();
    console.log('Loading employee dashboard for:', employeeId);

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
    console.log('Loading projects for employee:', employeeId);
    
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
    console.log('Loading tasks for employee:', employeeId);
    
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
              updatedAt: this.formatDate(task.updatedAt),
              verification: this.parseVerification(task.verification)
            }));
            this.tasks.set(formattedTasks);
            this.updateDashboardStats();

            this.taskService
              .processTaskRemindersForWindow(120)
              .catch((error: any) => console.error('❌ Error processing task reminders:', error));
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
      const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
      if (dateOnlyMatch) {
        const year = Number(dateOnlyMatch[1]);
        const month = Number(dateOnlyMatch[2]) - 1;
        const day = Number(dateOnlyMatch[3]);
        return new Date(year, month, day, 23, 59, 59, 999);
      }

      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    
    // Default fallback
    return new Date();
  }
   private loadTasksDirectly(employeeId: string) {
    console.log('Loading tasks directly for employee:', employeeId);
    
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
                verification: this.parseVerification(data['verification']),
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
    console.log('Updating dashboard stats...');
    
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
    
    console.log('Dashboard stats calculated:', stats);
    this.dashboardStats.set(stats);
  }

  loadEmployeeInfo(employeeId: string) {
    console.log('Loading employee info...');
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

  async loadNotifications() {
    const userId = this.currentUserId();
    if (!userId) return;

    try {
      this.notificationService
        .getNotifications(userId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (notifications) => this.notifications.set(notifications),
          error: (error: any) => {
            console.error('❌ Error loading notifications:', { uid: userId, error });
          }
        });
    } catch (error: any) {
      console.error('❌ Failed to initialize employee notifications stream:', { uid: userId, error });
    }
  }

  loadConversations(employeeId: string) {
    console.log('Loading conversations for employee:', employeeId);
    
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
          
          console.log('Conversations loaded:', conversations.length);
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

    this.chatService.getConversationMessages(userId1, userId2)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (messages) => {
          console.log('Messages loaded (realtime):', messages.length);
          this.chatMessages.set(messages as DashboardMessage[]);
          void this.markConversationSeen(userId1, userId2);
          setTimeout(() => {
            this.scrollToBottom();
          }, 100);
        },
        error: (error: any) => {
          console.error('❌ Subscription error in loadMessages:', error);
          this.chatMessages.set([]);
        }
      });
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
    const deadline = this.formatDate(task.deadline);
    deadline.setHours(23, 59, 59, 999);
    return deadline.getTime() < Date.now() && task.status !== 'done';
  }

  getUnreadCount(adminId: string): number {
    const conv = this.conversations().find(c => c.adminId === adminId);
    return conv?.unreadCount || 0;
  }

  getNotificationDate(value: any): Date {
    if (value?.toDate) {
      return value.toDate();
    }
    return value instanceof Date ? value : new Date(value);
  }

  // UI Interaction Methods
  toggleNotifications() {
    this.showNotifications.update(v => !v);
  }

  async markAsRead(notificationId: string) {
    try {
      await this.notificationService.markAsRead(notificationId);
    } catch (error: any) {
      console.error('❌ Error marking notification as read:', error);
    }
  }

  async clearAllNotifications() {
    const userId = this.currentUserId();
    if (!userId) {
      return;
    }

    try {
      await this.notificationService.markAllAsRead(userId);
    } catch (error: any) {
      console.error('❌ Error clearing notifications:', error);
    }
  }

  viewAllTasks() {
    this.activeTab.set('tasks');
    this.clearProjectTaskScope();
  }

  viewAllProjects() {
    this.activeTab.set('projects');
  }

  updateTaskProgress(task: Task) {
    if (this.isTaskLockedForReview(task) || task.status === 'done') {
      return;
    }

    const newProgress = Math.min(100, task.completionPercentage + 10);
    
    // Update locally first for immediate feedback
    const updatedTask = { ...task, completionPercentage: newProgress };
    if (newProgress > 0 && task.status === 'todo') {
      updatedTask.status = 'in-progress';
    }
    
    // Update in Firestore
    this.taskService.updateTask(task.id, {
      completionPercentage: newProgress,
      status: updatedTask.status
    })
      .then(() => {
        console.log('Task progress updated');
        this.loadEmployeeTasks(this.currentUserId());
      })
      .catch((error: any) => {
        console.error('❌ Error updating task progress:', error);
        void this.showAlert('Error updating task: ' + error.message, 'error', 'Task Error');
      });
  }

  updateTaskProgressFromRange(task: Task, event: any) {
    if (this.isTaskLockedForReview(task) || task.status === 'done') {
      return;
    }

    const newProgress = parseInt(event.target.value, 10);
    
    // Update locally first for immediate feedback
    const updatedTask = { ...task, completionPercentage: newProgress };
    if (newProgress > 0 && task.status === 'todo') {
      updatedTask.status = 'in-progress';
    }
    
    // Update in Firestore
    this.taskService.updateTask(task.id, {
      completionPercentage: newProgress,
      status: updatedTask.status
    })
      .then(() => {
        console.log('Task progress updated from range');
        this.loadEmployeeTasks(this.currentUserId());
      })
      .catch((error: any) => {
        console.error('❌ Error updating task progress:', error);
      });
  }

  updateTaskStatusToDone(task: Task) {
    void this.showAlert('Tasks must be submitted for admin verification before completion.', 'info', 'Verification Required');
    return;

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
        console.log('Task marked as done');
        this.loadEmployeeTasks(this.currentUserId());
      })
      .catch((error: any) => {
        console.error('❌ Error updating task status:', error);
        void this.showAlert('Error updating task: ' + error.message, 'error', 'Task Error');
      });
  }

  async addComment(task: Task) {
    if (this.isTaskLockedForReview(task)) {
      await this.showAlert('This task is pending admin review. Comments are locked until reviewed.', 'info', 'Task Locked');
      return;
    }

    const comment = await this.showTextInput('Add Comment', 'Enter your comment');
    if (comment) {
      this.taskService.addCommentToTask(
        task.id,
        this.currentUserId(),
        this.userName(),
        'employee',
        comment
      )
        .then(() => {
          console.log('Comment added');
          this.loadEmployeeTasks(this.currentUserId());
        })
        .catch((error: any) => {
          console.error('❌ Error adding comment:', error);
          void this.showAlert('Error adding comment: ' + error.message, 'error', 'Comment Error');
        });
    }
  }

  addCommentToTask(task: Task, inputElement: HTMLInputElement) {
    if (this.isTaskLockedForReview(task)) {
      return;
    }

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
          console.log('Comment added');
          inputElement.value = '';
          this.loadEmployeeTasks(this.currentUserId());
        })
        .catch((error: any) => {
          console.error('❌ Error adding comment:', error);
          void this.showAlert('Error adding comment: ' + error.message, 'error', 'Comment Error');
        });
    }
  }

  getTaskScore(task: Task): number {
    return this.taskService.getTaskPriorityScore(task);
  }

  openTaskActivity(taskId: string) {
    this.selectedActivityTaskId.set(taskId);
    this.taskService.getTaskActivity(taskId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entries) => this.taskActivities.set(entries),
        error: (error: any) => {
          console.error('❌ Error loading task activity:', error);
          this.taskActivities.set([]);
        }
      });
  }

  async setTaskRemindersPrompt(task: Task) {
    if (this.isTaskLockedForReview(task)) {
      await this.showAlert('This task is pending admin review. Reminders are locked until reviewed.', 'info', 'Task Locked');
      return;
    }

    const currentValue = (task.reminderOffsetsMinutes || []).join(', ');
    const input = await this.showTextInput('Reminders', 'Enter reminder offsets in minutes (comma separated)', currentValue);
    if (input === null) {
      return;
    }

    const reminderOffsets = this.parseNumberList(input);

    try {
      await this.taskService.setTaskReminders(
        task.id,
        reminderOffsets,
        this.currentUserId(),
        this.userName(),
        'employee'
      );
      this.loadEmployeeTasks(this.currentUserId());
    } catch (error: any) {
      console.error('❌ Error updating reminders:', error);
      await this.showAlert('Failed to update reminders: ' + error.message, 'error', 'Reminder Update Failed');
    }
  }

  async logOneHour(taskId: string) {
    const targetTask = this.tasks().find(task => task.id === taskId);
    if (targetTask && this.isTaskLockedForReview(targetTask)) {
      await this.showAlert('This task is pending admin review. Time logging is locked until reviewed.', 'info', 'Task Locked');
      return;
    }

    try {
      await this.taskService.addActualHours(taskId, 1);
      this.loadEmployeeTasks(this.currentUserId());
    } catch (error: any) {
      console.error('❌ Error logging one hour:', error);
      await this.showAlert('Failed to log time: ' + error.message, 'error', 'Time Log Failed');
    }
  }

  private parseNumberList(value: string): number[] {
    if (!value || typeof value !== 'string') {
      return [];
    }

    return value
      .split(',')
      .map(item => Number(item.trim()))
      .filter(item => !Number.isNaN(item) && item > 0)
      .map(item => Math.round(item));
  }

  private async showAlert(message: string, icon: 'success' | 'error' | 'info' = 'info', title = 'Notification') {
    await Swal.fire({
      title,
      text: message,
      icon,
      confirmButtonText: 'OK'
    });
  }

  private async showConfirm(message: string, title = 'Please Confirm'): Promise<boolean> {
    const result = await Swal.fire({
      title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel'
    });
    return result.isConfirmed;
  }

  private async showTextInput(
    title: string,
    label: string,
    currentValue = '',
    inputType: 'text' | 'textarea' = 'text'
  ): Promise<string | null> {
    const result = await Swal.fire({
      title,
      input: inputType,
      inputLabel: label,
      inputValue: currentValue,
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return null;
    }

    return String(result.value ?? '').trim();
  }

  isTaskLockedForReview(task: Task): boolean {
    return task.status === 'pending-approval';
  }

  async submitTaskForReview(task: Task) {
    if (this.isTaskLockedForReview(task) || task.status === 'done') {
      return;
    }

    const result = await Swal.fire({
      title: 'Submit Task for Review',
      html: `
        <div style="text-align:left; display:grid; gap:10px;">
          <label for="verification-notes" style="font-weight:600;">Completion Notes *</label>
          <textarea id="verification-notes" class="swal2-textarea" placeholder="Summarize what was completed"></textarea>
          <label for="verification-evidence" style="font-weight:600;">Evidence Links (optional)</label>
          <textarea id="verification-evidence" class="swal2-textarea" placeholder="One URL per line"></textarea>
          <label for="verification-time" style="font-weight:600;">Time Spent (hours) *</label>
          <input id="verification-time" type="number" min="0.5" step="0.5" class="swal2-input" value="${Math.max(1, task.actualHours || 0)}" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
      focusConfirm: false,
      preConfirm: () => {
        const notesInput = document.getElementById('verification-notes') as HTMLTextAreaElement | null;
        const evidenceInput = document.getElementById('verification-evidence') as HTMLTextAreaElement | null;
        const timeInput = document.getElementById('verification-time') as HTMLInputElement | null;

        const completionNotes = (notesInput?.value || '').trim();
        const evidence = (evidenceInput?.value || '')
          .split(/\r?\n/)
          .map(item => item.trim())
          .filter(Boolean);
        const timeSpent = Number(timeInput?.value || 0);

        if (!completionNotes) {
          Swal.showValidationMessage('Completion notes are required.');
          return null;
        }

        if (!Number.isFinite(timeSpent) || timeSpent <= 0) {
          Swal.showValidationMessage('Time spent must be greater than 0.');
          return null;
        }

        return { completionNotes, evidence, timeSpent };
      }
    });

    if (!result.isConfirmed || !result.value) {
      return;
    }

    try {
      await this.taskService.submitTaskForApproval(task.id, this.currentUserId(), result.value);
      await this.showAlert('Task submitted for admin approval.', 'success', 'Submitted');
      this.loadEmployeeTasks(this.currentUserId());
      this.updateDashboardStats();
    } catch (error: any) {
      console.error('❌ Error submitting task for approval:', error);
      await this.showAlert('Failed to submit task: ' + error.message, 'error', 'Submission Failed');
    }
  }

  private parseVerification(value: any): TaskVerification | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return {
      submittedBy: value['submittedBy'] || '',
      submittedAt: this.formatDate(value['submittedAt']),
      status: value['status'] || 'pending-approval',
      completionNotes: value['completionNotes'] || '',
      evidence: Array.isArray(value['evidence']) ? value['evidence'].map((item: any) => String(item)) : [],
      timeSpent: Number(value['timeSpent'] || 0),
      approvedBy: value['approvedBy'] || undefined,
      approvedAt: value['approvedAt'] ? this.formatDate(value['approvedAt']) : undefined,
      rejectionReason: value['rejectionReason'] || undefined
    };
  }

  viewTaskDetails(task: Task) {
    console.log('View task details:', task);
    void this.showAlert(`Title: ${task.title}\nDescription: ${task.description}\nStatus: ${task.status}\nProgress: ${task.completionPercentage}%`, 'info', 'Task Details');
  }

  viewProjectDetails(project: Project) {
    console.log('View project details:', project);
    void this.showAlert(`Name: ${project.name}\nDescription: ${project.description}\nStatus: ${project.status}\nCompletion: ${project.completionPercentage || 0}%`, 'info', 'Project Details');
  }

  viewProjectTasks(project: Project) {
    console.log('View project tasks:', project);
    this.activeTab.set('tasks');
    this.selectedTaskProjectId = project.id;
    this.taskFilter = 'all';
    this.taskSort = 'deadline';
  }

  clearProjectTaskScope() {
    this.selectedTaskProjectId = null;
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
    
    console.log('Selecting admin:', admin.name);
    this.selectedAdmin.set(admin);
    this.selectedConversation.set(null);
    this.loadMessages(this.currentUserId(), admin.id);
  }

  selectConversation(conv: DashboardConversation, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('Selecting conversation with:', conv.adminName);
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

  private async markConversationSeen(userId1: string, userId2: string) {
    try {
      await this.chatService.markConversationAsRead(userId1, userId2, this.currentUserId());
      this.loadConversations(this.currentUserId());
    } catch (error) {
      console.error('❌ Error marking conversation as seen:', error);
    }
  }

  async sendChatMessage() {
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.warn('Cannot send message: Employee not authenticated');
      return;
    }
    
    const messageContent = this.chatMessage.trim();
    if (!messageContent) {
      return;
    }
    
    const recipientId = this.selectedAdmin()?.id || this.selectedConversation()?.adminId;
    if (!recipientId) {
      await this.showAlert('Please select an administrator to chat with', 'info', 'Select Recipient');
      return;
    }
    
    console.log('Sending message to admin:', recipientId);
    
    try {
      this.chatMessage = '';

      await this.chatService.sendMessage(
        this.currentUserId(),
        this.userName(),
        'employee',
        recipientId,
        messageContent
      );

    } catch (error: any) {
      this.chatMessage = messageContent;
      console.error('❌ Error sending message:', error);
      await this.showAlert('Failed to send message. Please try again.', 'error', 'Chat Error');
    }
  }

  // Profile Methods
  editProfile() {
    void this.showAlert('Edit profile functionality coming soon!', 'info', 'Not Yet Available');
  }

    changePassword() {
    const userEmail = this.userEmail();
    const user = this.auth.currentUser;
    
    if (userEmail && user) {
      import('firebase/auth').then(({ sendPasswordResetEmail }) => {
        sendPasswordResetEmail(this.auth, userEmail)
          .then(() => {
            void this.showAlert('Password reset email sent! Check your inbox.', 'success', 'Password Reset');
          })
          .catch((error: any) => {
            void this.showAlert('Error sending password reset email: ' + error.message, 'error', 'Password Reset Failed');
          });
      });
    } else {
      void this.showAlert('Cannot change password: No user email found or not authenticated', 'error', 'Password Reset Failed');
    }
  }


  async updateSkills() {
    const skills = await this.showTextInput('Skills', 'Enter your skills (comma separated)');
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
              void this.showAlert('Skills updated successfully!', 'success', 'Skills Updated');
            })
            .catch((error: any) => {
              void this.showAlert('Error updating skills: ' + error.message, 'error', 'Skills Update Failed');
            });
        }
      });
    }
  }

  viewReports() {
    void this.showAlert('View reports functionality coming soon!', 'info', 'Not Yet Available');
  }

  async requestAccountDeletion() {
    if (await this.showConfirm('Are you sure you want to request account deletion? This will notify administrators.', 'Request Account Deletion')) {
      await this.showAlert('Account deletion request sent to administrators.', 'success', 'Request Sent');
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