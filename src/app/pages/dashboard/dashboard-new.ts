import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef
} from '@angular/core';

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

/* ===== Services ONLY ===== */
import { AuthService } from '../../services/auth-service/auth-service';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { ChatService } from '../../services/chat.service';
import { NotificationService, Notification } from '../../services/notification.service';

/* ===== Models ===== */
import {
  Project,
  Task,
  User,
  AdminDashboardStats,
  Conversation,
  TaskActivityEntry
} from '../../interfaces/models';
import { Firestore, collection, query, where, getDocs, addDoc, doc, setDoc, getDoc, Timestamp, orderBy, QueryDocumentSnapshot } from '@angular/fire/firestore';
import { Observable, Subscriber, catchError, of, timeout, from } from 'rxjs';
import Swal from 'sweetalert2';

// Interface for dashboard conversations - matches Conversation interface
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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="dashboard-container">
      <!-- Access Denied State -->
      @if (!isAdmin()) {
        <div class="access-denied">
          <div class="denied-icon"><span class="material-symbols-rounded app-icon">block</span></div>
          <h1>Access Denied</h1>
          <p>This dashboard is restricted to administrators only.</p>
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
               [class.active]="activeTab() === 'projects'" 
               (click)="onTabChange('projects', $event)">
              <span class="icon material-symbols-rounded app-icon">folder</span> Projects
            </a>
            
            <a class="nav-item" 
               [class.active]="activeTab() === 'tasks'" 
               (click)="onTabChange('tasks', $event)">
              <span class="icon material-symbols-rounded app-icon">task_alt</span> Tasks
            </a>
            
            <a class="nav-item" 
               [class.active]="activeTab() === 'chat'" 
               (click)="onTabChange('chat', $event)">
              <span class="icon material-symbols-rounded app-icon">chat</span> Chat
            </a>
            
            <a class="nav-item" 
               [class.active]="activeTab() === 'settings'" 
               (click)="onTabChange('settings', $event)">
              <span class="icon material-symbols-rounded app-icon">settings</span> Settings
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
                  <p class="user-role">Administrator</p>
                </div>
              </div>
            </div>
          </header>

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
                    <span class="stat-icon material-symbols-rounded app-icon">folder</span>
                    <h3>Total Projects</h3>
                  </div>
                  <p class="stat-value">{{ dashboardStats()?.totalProjects ?? 0 }}</p>
                  <p class="stat-label">Active: {{ dashboardStats()?.activeProjects ?? 0 }}</p>
                </div>

                <div class="stat-card">
                  <div class="stat-header">
                    <span class="stat-icon material-symbols-rounded app-icon">task_alt</span>
                    <h3>Task Completion</h3>
                  </div>
                  <p class="stat-value">{{ (dashboardStats()?.taskCompletionRate ?? 0).toFixed(1) }}%</p>
                  <p class="stat-label">{{ dashboardStats()?.completedTasks ?? 0 }}/{{ dashboardStats()?.totalTasks ?? 0 }} tasks</p>
                </div>

                <div class="stat-card">
                  <div class="stat-header">
                    <span class="stat-icon material-symbols-rounded app-icon">groups</span>
                    <h3>Active Employees</h3>
                  </div>
                  <p class="stat-value">{{ dashboardStats()?.activeEmployees ?? 0 }}</p>
                  <p class="stat-label">Team members</p>
                </div>

                <div class="stat-card">
                  <div class="stat-header">
                    <span class="stat-icon material-symbols-rounded app-icon">hourglass_top</span>
                    <h3>Pending Tasks</h3>
                  </div>
                  <p class="stat-value">{{ (dashboardStats()?.totalTasks ?? 0) - (dashboardStats()?.completedTasks ?? 0) }}</p>
                  <p class="stat-label">Need attention</p>
                </div>
              </div>

              <!-- Project Progress Timeline -->
              <div class="section">
                <h2>Project Progress</h2>
                <div class="project-progress-list">
                  @if (dashboardStats()?.projectProgress && dashboardStats()!.projectProgress.length > 0) {
                    @for (project of dashboardStats()!.projectProgress; track project.projectId) {
                      <div class="progress-item">
                        <div class="progress-headline">
                          <div class="progress-title-wrap">
                            <span class="material-symbols-rounded app-icon progress-project-icon">folder</span>
                            <div>
                              <h3>{{ project.projectName }}</h3>
                              <p class="progress-subtitle">{{ project.tasksTotal }} total tasks</p>
                            </div>
                          </div>
                          <span class="progress-value">{{ project.progress.toFixed(0) }}%</span>
                        </div>
                        <div class="progress-track">
                          <div class="progress-fill" [style.width.%]="project.progress"></div>
                        </div>
                        <div class="progress-meta">
                          <span class="progress-chip">
                            <span class="material-symbols-rounded">task_alt</span>
                            {{ project.tasksDone }}/{{ project.tasksTotal }} completed
                          </span>
                          <span class="progress-chip">
                            <span class="material-symbols-rounded">event</span>
                            Due {{ project.endDate | date: 'MMM dd, yyyy' }}
                          </span>
                        </div>
                      </div>
                    }
                  } @else {
                    <div class="empty-state">
                      <p>No projects yet. Create your first project!</p>
                    </div>
                  }
                </div>
              </div>
            </section>
          }

          <!-- Projects Tab -->
          @if (activeTab() === 'projects') {
            <section class="content">
              <div class="section-header">
                <h2>Manage Projects</h2>
                <div style="display: flex; gap: 10px;">
                  <button class="btn btn-primary" (click)="toggleCreateProjectForm()">+ New Project</button>
                  <button class="btn btn-secondary" (click)="createTestProject()" style="background: #f59e0b;">Test Project</button>
                </div>
              </div>

              @if (showCreateProjectForm()) {
                <div class="form-card">
                  <h3>Create New Project</h3>
                  <form [formGroup]="projectForm" (ngSubmit)="createProject()" class="form">
                    <input type="text" placeholder="Project Name" formControlName="name" class="input">
                    @if (projectForm.get('name')?.invalid && projectForm.get('name')?.touched) {
                      <small class="error">Project name is required (min 3 characters)</small>
                    }
                    <textarea placeholder="Description" formControlName="description" class="textarea"></textarea>
                    @if (projectForm.get('description')?.invalid && projectForm.get('description')?.touched) {
                      <small class="error">Description is required</small>
                    }
                    <div class="date-row">
                      <div>
                        <label>Start Date</label>
                        <input type="date" formControlName="startDate" class="input">
                        @if (projectForm.get('startDate')?.invalid && projectForm.get('startDate')?.touched) {
                          <small class="error">Start date is required</small>
                        }
                      </div>
                      <div>
                        <label>End Date</label>
                        <input type="date" formControlName="endDate" class="input">
                        @if (projectForm.get('endDate')?.invalid && projectForm.get('endDate')?.touched) {
                          <small class="error">End date is required</small>
                        }
                      </div>
                    </div>
                    <select formControlName="status" class="input">
                      <option value="">Select Status</option>
                      <option value="planning">Planning</option>
                      <option value="in-progress">In Progress</option>
                      <option value="on-hold">On Hold</option>
                      <option value="completed">Completed</option>
                    </select>
                    @if (projectForm.get('status')?.invalid && projectForm.get('status')?.touched) {
                      <small class="error">Status is required</small>
                    }

                    <div>
                      <label>Team Members (can receive project tasks)</label>
                      <div class="team-members-selector" style="display:grid; gap:8px; margin-top:8px;">
                        @if (employees().length > 0) {
                          @for (emp of employees(); track emp.id) {
                            <label style="display:flex; align-items:center; gap:8px;">
                              <input
                                type="checkbox"
                                [checked]="isProjectTeamMemberSelected(emp.id)"
                                (change)="toggleProjectTeamMember(emp.id, $event)"
                              >
                              <span>{{ emp.name || emp.email }} ({{ emp.email }})</span>
                            </label>
                          }
                        } @else {
                          <small>No employees available</small>
                        }
                      </div>
                      <small>Only selected employees can be assigned tasks in this project.</small>
                    </div>

                    <div class="form-actions">
                      <button type="submit" class="btn btn-primary" [disabled]="!projectForm.valid">Create Project</button>
                      <button type="button" class="btn btn-secondary" (click)="toggleCreateProjectForm()">Cancel</button>
                    </div>
                  </form>
                </div>
              }

              <div class="projects-grid">
                @if (projects().length > 0) {
                  @for (project of projects(); track project.id) {
                    <div class="project-card">
                      <div class="project-header">
                        <h3>{{ project.name || 'Unnamed Project' }}</h3>
                        <div class="project-actions">
                          <button class="btn-icon" (click)="editProject(project)" title="Edit Team"><span class="material-symbols-rounded app-icon">groups</span></button>
                          <button class="btn-icon" (click)="deleteProject(project)" title="Delete Project and Tasks"><span class="material-symbols-rounded app-icon">delete</span></button>
                        </div>
                      </div>
                      <p class="project-description">{{ project.description || 'No description' }}</p>
                      <div class="project-meta">
                        <span class="badge" 
                              [class.status-planning]="project.status === 'planning'" 
                              [class.status-in-progress]="project.status === 'in-progress'"
                              [class.status-on-hold]="project.status === 'on-hold'"
                              [class.status-completed]="project.status === 'completed'">
                          {{ project.status || 'planning' | titlecase }}
                        </span>
                        <span class="meta-chip"><span class="material-symbols-rounded">groups</span>Team: {{ (project.teamMembers || []).length }} members</span>
                        <span class="meta-chip"><span class="material-symbols-rounded">task_alt</span>Tasks: {{ project.taskCount || 0 }}</span>
                        <label class="project-status-control" title="Update project status">
                          <span class="material-symbols-rounded">sync_alt</span>
                          <select class="input" [value]="project.status" (change)="changeProjectStatus(project, $event)">
                            <option value="planning">Planning</option>
                            <option value="in-progress">In Progress</option>
                            <option value="on-hold">On Hold</option>
                            <option value="completed">Completed</option>
                          </select>
                        </label>
                      </div>
                      <div class="progress-bar-container">
                        <div class="progress-bar" [style.width.%]="project.completionPercentage || 0"></div>
                      </div>
                      <p class="progress-text">{{ project.completedTaskCount || 0 }} / {{ project.taskCount || 0 }} tasks done • {{ (project.completionPercentage || 0).toFixed(0) }}% complete</p>
                      <div class="project-dates">
                        <small>Start: {{ project.startDate | date: 'MMM dd, yyyy' }}</small>
                        <small>End: {{ project.endDate | date: 'MMM dd, yyyy' }}</small>
                      </div>
                    </div>
                  }
                } @else {
                  <div class="empty-state">
                    <p>No projects yet. Create your first project!</p>
                  </div>
                }
              </div>
            </section>
          }

          <!-- Tasks Tab -->
          @if (activeTab() === 'tasks') {
            <section class="content">
              <div class="section-header">
                <h2>Create & Assign Tasks</h2>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <select class="input" style="min-width: 180px;" [ngModel]="selectedTaskFilter()" (ngModelChange)="applySavedTaskFilter($event)">
                    <option value="all">All Tasks</option>
                    <option value="my-overdue">My Overdue</option>
                    <option value="due-this-week">Due This Week</option>
                    <option value="unassigned">Unassigned</option>
                  </select>
                  <button class="btn btn-primary" (click)="toggleCreateTaskForm()">+ New Task</button>
                </div>
              </div>

              <div class="form-card" style="margin-bottom: 16px;">
                <h3>Bulk Actions</h3>
                <div class="form-row">
                  <select class="input" [(ngModel)]="bulkStatus">
                    <option value="">Bulk Status</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>

                  <select class="input" [(ngModel)]="bulkPriority">
                    <option value="">Bulk Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>

                  <select class="input" [(ngModel)]="bulkAssignee">
                    <option value="">Bulk Assignee</option>
                    @for (emp of employees(); track emp.id) {
                      <option [value]="emp.id">{{ emp.name || emp.email }}</option>
                    }
                  </select>
                </div>
                <div class="form-actions">
                  <button class="btn btn-primary" (click)="applyBulkUpdate()" [disabled]="selectedTaskIds().length === 0">Apply to {{ selectedTaskIds().length }} Task(s)</button>
                </div>
              </div>

              @if (showCreateTaskForm()) {
                <div class="form-card">
                  <h3>Assign Task to Employee</h3>
                  <form [formGroup]="taskForm" (ngSubmit)="createTask()" class="form">
                    <select formControlName="projectId" class="input">
                      <option value="">Select Project</option>
                      @if (projects().length > 0) {
                        @for (proj of projects(); track proj.id) {
                          <option [value]="proj.id">{{ proj.name }}</option>
                        }
                      } @else {
                        <option value="" disabled>No projects available. Create a project first.</option>
                      }
                    </select>

                    <select formControlName="assignedTo" class="input">
                      <option value="">Assign To Employee</option>
                      @if (!taskForm.get('projectId')?.value) {
                        <option value="" disabled>Select a project first</option>
                      } @else if (getAssignableEmployeesForSelectedProject().length > 0) {
                        @for (emp of getAssignableEmployeesForSelectedProject(); track emp.id) {
                          <option [value]="emp.id">{{ emp.name }} ({{ emp.email }})</option>
                        }
                      } @else {
                        <option value="" disabled>No team members in this project</option>
                      }
                    </select>

                    <input type="text" placeholder="Task Title" formControlName="title" class="input">
                    <textarea placeholder="Task Description" formControlName="description" class="textarea"></textarea>

                    <div class="form-row">
                      <input type="date" formControlName="deadline" class="input">
                      <select formControlName="priority" class="input">
                        <option value="">Priority</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div class="form-row">
                      <input type="number" placeholder="Effort Points" formControlName="effortPoints" class="input">
                      <input type="number" placeholder="Estimated Hours" formControlName="estimatedHours" class="input">
                    </div>

                    <div class="form-row">
                      <input type="text" placeholder="Reminder Offsets (minutes, comma separated)" formControlName="reminderOffsetsMinutes" class="input">
                    </div>

                    <div class="form-actions">
                      <button type="submit" class="btn btn-primary" [disabled]="!taskForm.valid || projects().length === 0 || getAssignableEmployeesForSelectedProject().length === 0">Create Task</button>
                      <button type="button" class="btn btn-secondary" (click)="toggleCreateTaskForm()">Cancel</button>
                    </div>
                  </form>
                </div>
              }

              <div class="tasks-list">
                @if (displayedTasks().length > 0) {
                  @for (task of displayedTasks(); track task.id) {
                    <div class="task-card">
                      <div class="task-header">
                        <label style="display:flex; align-items:center; gap:6px; margin-right:8px;">
                          <input type="checkbox" [checked]="isTaskSelected(task.id)" (change)="toggleTaskSelection(task.id)">
                          Select
                        </label>
                        <h3>{{ task.title }}</h3>
                        <span class="priority-badge" [class]="'priority-' + task.priority">{{ task.priority | uppercase }}</span>
                      </div>
                      <p>{{ task.description }}</p>
                      <div class="task-meta">
                        <span>Assigned to: {{ getEmployeeName(task.assignedTo) }}</span>
                        <span>Deadline: {{ task.deadline | date: 'MMM dd, yyyy' }}</span>
                        <span>Score: {{ getTaskScore(task).toFixed(2) }}</span>
                        <span>Hours: {{ task.actualHours || 0 }}/{{ task.estimatedHours || 0 }}</span>
                      </div>
                      <div class="task-status">
                        <span class="status-badge" [class]="'status-' + task.status">{{ task.status | titlecase }}</span>
                        <span>{{ task.completionPercentage }}%</span>
                      </div>
                      <div class="progress-bar-container">
                        <div class="progress-bar" [style.width.%]="task.completionPercentage"></div>
                      </div>
                      <div class="task-actions">
                        <button class="btn-small" (click)="editTask(task)">Edit</button>
                        <button class="btn-small" (click)="openTaskActivity(task.id)">Activity</button>
                        <button class="btn-small" (click)="setTaskRemindersPrompt(task)">Reminders</button>
                        <button class="btn-small" (click)="logOneHour(task.id)">+1h</button>
                        <button class="btn-small" (click)="deleteTask(task.id)">Delete</button>
                      </div>
                    </div>
                  }
                } @else {
                  <div class="empty-state">
                    <p>No tasks yet. Create your first task!</p>
                  </div>
                }
              </div>

              @if (selectedActivityTaskId()) {
                <div class="form-card" style="margin-top: 16px;">
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

          <!-- Chat Tab -->
          @if (activeTab() === 'chat') {
            <section class="content">
              <div class="section-header">
                <h2>Chat with Employees</h2>
              </div>

              <div class="chat-container">
                <div class="chat-sidebar">
                  <h3>Conversations</h3>
                  <div class="conversations-list">
                    @if (conversations().length > 0) {
                      @for (conv of conversations(); track conv.id) {
                        <div class="conversation-item" 
                             [class.active]="selectedConversation()?.id === conv.id"
                             (click)="selectConversation(conv, $event)">
                          <div class="conv-avatar">
                            <img [src]="'https://ui-avatars.com/api/?name=' + conv.employeeName" alt="Employee">
                          </div>
                          <div class="conv-info">
                            <h4>{{ conv.employeeName }}</h4>
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
                  @if (selectedConversation()) {
                    <div class="chat-header">
                      <div class="chat-title-wrap">
                        <h3>Chat with {{ selectedConversation()?.employeeName }}</h3>
                        <p class="chat-subtitle">Realtime conversation</p>
                      </div>
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
                      <p>Select a conversation to start chatting</p>
                    </div>
                  }
                </div>
              </div>
            </section>
          }

          <!-- Settings Tab -->
          @if (activeTab() === 'settings') {
            <section class="content">
              <h2>Settings</h2>
              <div class="settings-card admin-profile-card">
                <div class="admin-profile-headline">
                  <div class="admin-profile-identity">
                    <img class="admin-profile-avatar" [src]="'https://ui-avatars.com/api/?name=' + userName()" alt="Admin Profile">
                    <div>
                      <h3>Admin Profile</h3>
                      <p class="admin-profile-subtitle">Your account information and role details</p>
                    </div>
                  </div>
                  <span class="meta-chip">
                    <span class="material-symbols-rounded">verified_user</span>
                    Administrator
                  </span>
                </div>

                <div class="admin-profile-grid">
                  <div class="admin-profile-row">
                    <span class="material-symbols-rounded">badge</span>
                    <p><strong>Name:</strong> {{ userName() }}</p>
                  </div>
                  <div class="admin-profile-row">
                    <span class="material-symbols-rounded">mail</span>
                    <p><strong>Email:</strong> {{ userEmail() }}</p>
                  </div>
                  <div class="admin-profile-row">
                    <span class="material-symbols-rounded">admin_panel_settings</span>
                    <p><strong>Role:</strong> Administrator</p>
                  </div>
                  <div class="admin-profile-row">
                    <span class="material-symbols-rounded">fingerprint</span>
                    <p><strong>User ID:</strong> {{ currentUserId() }}</p>
                  </div>
                </div>
              </div>
            </section>
          }
        </main>
      }
    </div>
  `,
  styles: ``,
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private chatService = inject(ChatService);
  private notificationService = inject(NotificationService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  // Signals
  isAdmin = signal(false);
  userRole = signal('');
  userName = signal('');
  userEmail = signal('');
  currentUserId = signal('');

  projects = signal<Project[]>([]);
  tasks = signal<Task[]>([]);
  displayedTasks = signal<Task[]>([]);
  employees = signal<User[]>([]);
  conversations = signal<DashboardConversation[]>([]);
  chatMessages = signal<DashboardMessage[]>([]);
  notifications = signal<Notification[]>([]);
  taskActivities = signal<TaskActivityEntry[]>([]);
  selectedActivityTaskId = signal<string | null>(null);
  selectedTaskIds = signal<string[]>([]);
  projectTeamSelection = signal<string[]>([]);

  selectedTaskFilter = signal<'all' | 'my-overdue' | 'due-this-week' | 'unassigned'>('all');
  bulkStatus = '';
  bulkPriority = '';
  bulkAssignee = '';

  dashboardStats = signal<AdminDashboardStats | null>(null);

  activeTab = signal<'dashboard' | 'projects' | 'tasks' | 'chat' | 'settings'>('dashboard');
  showNotifications = signal(false);
  showCreateProjectForm = signal(false);
  showCreateTaskForm = signal(false);
  selectedConversation = signal<DashboardConversation | null>(null);
  chatMessage = '';

  unreadNotifications = computed(() => this.notifications().filter(notification => !notification.read).length);

  projectForm!: FormGroup;
  taskForm!: FormGroup;

  ngOnInit() {
    console.log('Admin Dashboard initialized');
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserId.set(user.uid);
      this.userName.set(user.displayName || user.email || 'Admin');
      this.userEmail.set(user.email || '');
      console.log('User loaded:', user.email, 'UID:', user.uid);
      this.checkUserRole();
    } else {
      console.warn('No user found, redirecting to signin');
      this.router.navigate(['/signin']);
    }

    this.initializeForms();
  }

  async checkUserRole() {
    const userId = this.currentUserId();
    if (!userId) {
      return;
    }

    try {
      const role = await this.authService.getUserRole(userId);
      this.isAdmin.set(role === 'admin');
      this.userRole.set(role);
      console.log('User role:', role, 'Is admin:', this.isAdmin());

      if (this.isAdmin()) {
        this.loadAdminDashboard();
      } else {
        console.warn('User is not admin, redirecting to employee dashboard');
        this.router.navigate(['/dashboard/employee']);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      this.router.navigate(['/signin']);
    }
  }

  loadAdminDashboard() {
    const adminId = this.currentUserId();
    console.log('Loading admin dashboard for:', adminId);

    if (!adminId) {
      console.error('❌ No admin ID available');
      return;
    }

    // Load projects
    this.loadAdminProjects();

    // Load tasks
    this.loadTasks();

    // Load notifications
    this.loadNotifications();

    // Load employees
    this.loadEmployees();

    // Load dashboard stats
    this.loadDashboardStats(adminId);

    // Don't load conversations on init - only when chat tab is selected
  }

  loadAdminProjects() {
    const adminId = this.currentUserId();
    console.log('Loading projects for admin:', adminId);
    
    if (!adminId) {
      console.error('❌ No admin ID found');
      return;
    }

    try {
      this.projectService.getAdminProjects(adminId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (projects) => {
            console.log('📥 Projects loaded successfully:', projects.length);
            if (projects.length > 0) {
              console.log('Sample project:', {
                id: projects[0].id,
                name: projects[0].name,
                status: projects[0].status
              });
            }
            this.projects.set(projects);
          },
          error: (error) => {
            console.error('❌ Error loading projects:', error);
          }
        });
    } catch (error) {
      console.error('❌ Exception in loadAdminProjects:', error);
    }
  }

  loadTasks() {
    console.log('Loading tasks...');
    const tasksRef = collection(this.firestore, 'tasks');
    getDocs(tasksRef)
      .then((querySnapshot) => {
        const tasks: Task[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const task: Task = {
            id: doc.id,
            projectId: data['projectId'] || '',
            title: data['title'] || '',
            description: data['description'] || '',
            assignedTo: data['assignedTo'] || '',
            assignedBy: data['assignedBy'] || '',
            deadline: data['deadline']?.toDate ? data['deadline'].toDate() : data['deadline'],
            priority: data['priority'] || 'medium',
            status: data['status'] || 'todo',
            completionPercentage: data['completionPercentage'] || 0,
            comments: data['comments'] || [],
            createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(),
            updatedAt: data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date()
          };
          tasks.push(task);
        });
        console.log('Tasks loaded:', tasks.length);
        this.tasks.set(tasks);
        this.refreshDisplayedTasks();
        this.selectedTaskIds.set([]);

        this.taskService
          .checkAndNotifyOverdueTasksForAdmin(this.currentUserId())
          .catch((error: any) => console.error('❌ Error checking overdue notifications:', error));

        this.taskService
          .processTaskRemindersForWindow(120)
          .catch((error: any) => console.error('❌ Error processing task reminders:', error));
      })
      .catch((error) => {
        console.error('❌ Error loading tasks:', error);
      });
  }

  loadEmployees() {
    console.log('Loading employees...');
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('role', '==', 'employee'));
    
    getDocs(q)
      .then((querySnapshot) => {
        const employees: User[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const employee: User = {
            id: doc.id,
            email: data['email'] || '',
            name: data['name'] || '',
            role: data['role'] || 'employee',
            createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(),
          };
          employees.push(employee);
        });
        console.log('Employees loaded:', employees.length);
        this.employees.set(employees);
      })
      .catch((error) => {
        console.error('❌ Error loading employees:', error);
      });
  }

  loadDashboardStats(adminId: string) {
    console.log('Loading dashboard stats...');
    this.projectService.getAdminDashboardStats(adminId)
      .then((stats) => {
        console.log('Dashboard stats loaded:', stats);
        this.dashboardStats.set(stats);
      })
      .catch((error) => {
        console.error('❌ Error loading dashboard stats:', error);
      });
  }

  // ULTIMATE FIX: Use getDocs() instead of collectionData() to avoid Firestore reference issues
  // Change this in loadConversationsUltimate method:
loadConversationsUltimate(adminId: string) {
  console.log('Loading conversations using getDocs() for admin:', adminId);
  
  if (!adminId) {
    console.error('❌ No admin ID provided');
    this.conversations.set([]);
    return;
  }

  try {
    // Add a guard to ensure we're in a proper context
    const firestore = this.firestore; // Store reference locally
    
    const conversationsRef = collection(firestore, 'conversations');
    const q = query(
      conversationsRef, 
      where('adminId', '==', adminId),
      orderBy('lastMessageTime', 'desc')
    );

    // Use getDocs() directly
    getDocs(q)
      .then((snapshot) => {
        const conversations: DashboardConversation[] = snapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            adminId: data['adminId'] || adminId,
            employeeId: data['employeeId'] || '',
            adminName: data['adminName'] || 'Admin',
            employeeName: data['employeeName'] || 'Employee',
            lastMessage: data['lastMessage'] || 'No messages yet',
            lastMessageTime: data['lastMessageTime']?.toDate ? 
              data['lastMessageTime'].toDate() : data['lastMessageTime'],
            unreadCount: data['unreadCount'] || 0
          };
        });
        
        console.log('Conversations loaded with getDocs():', conversations.length);
        this.conversations.set(conversations);
        
        // Auto-select first conversation if none selected
        if (conversations.length > 0 && !this.selectedConversation()) {
          this.selectConversationUltimate(conversations[0]);
        }
      })
      .catch((error) => {
        console.error('❌ Error loading conversations with getDocs:', error);
        
        // If it's an index error, provide helpful information
        if (error.code === 'failed-precondition') {
          console.error('🔧 Firestore index required! Please create a composite index for:');
          console.error('   - Collection: conversations');
          console.error('   - Fields: adminId (asc), lastMessageTime (desc)');
          console.error('   Or click the link in the error message above');
        }
        
        this.conversations.set([]);
      });
  } catch (error) {
    console.error('❌ Exception in loadConversationsUltimate:', error);
    this.conversations.set([]);
  }
}

  selectConversationUltimate(conv: DashboardConversation, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('Selecting conversation with:', conv.employeeName);
    
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.warn('Not authenticated for conversation selection');
      return;
    }
    
    this.selectedConversation.set(conv);
    
    // Load messages using getDocs() to avoid Firestore reference issues
    this.loadMessagesUltimate(this.currentUserId(), conv.employeeId);
  }

  loadMessagesUltimate(userId1: string, userId2: string) {
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
        error: (error) => {
          console.error('❌ Subscription error in loadMessagesUltimate:', error);
          this.chatMessages.set([]);
        }
      });
  }

  initializeForms() {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      status: ['planning', Validators.required],
      teamMembers: [[]],
    });

    this.taskForm = this.fb.group({
      projectId: ['', Validators.required],
      assignedTo: ['', Validators.required],
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      deadline: ['', Validators.required],
      priority: ['medium', Validators.required],
      effortPoints: [0],
      estimatedHours: [0],
      reminderOffsetsMinutes: [''],
    });

    this.taskForm.get('projectId')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((projectId) => {
        this.onTaskProjectChanged(projectId as string);
      });
  }

  onTabChange(tab: 'dashboard' | 'projects' | 'tasks' | 'chat' | 'settings', event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('Admin tab clicked:', tab, 'Auth state:', this.authService.getCurrentUser()?.email);
    
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.warn('Admin not authenticated when switching tabs');
      return;
    }
    
    if (this.userRole() !== 'admin') {
      console.warn('User is not admin, cannot access admin dashboard');
      return;
    }
    
    this.activeTab.set(tab);
    this.showNotifications.set(false);
    
    // Load data based on tab
    switch (tab) {
      case 'projects':
        this.loadAdminProjects();
        break;
      case 'tasks':
        this.loadTasks();
        break;
      case 'chat':
        // Use the ULTIMATE fix method to load conversations
        this.loadConversationsUltimate(this.currentUserId());
        break;
    }
  }

  async loadNotifications() {
    const adminId = this.currentUserId();
    if (!adminId) return;

    try {
      this.notificationService
        .getNotifications(adminId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (notifications) => this.notifications.set(notifications),
          error: (error: any) => console.error('❌ Error loading admin notifications:', { uid: adminId, error })
        });
    } catch (error: any) {
      console.error('❌ Failed to initialize admin notifications stream:', { uid: adminId, error });
    }
  }

  toggleNotifications() {
    this.showNotifications.update(value => !value);
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

  getNotificationDate(value: any): Date {
    if (value?.toDate) {
      return value.toDate();
    }
    return value instanceof Date ? value : new Date(value);
  }

  createProject() {
    if (this.projectForm.valid) {
      const adminId = this.currentUserId();
      const formValue = this.projectForm.value;
      
      console.log('Form values:', formValue);
      
      const projectData = {
        name: formValue.name,
        description: formValue.description,
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        status: formValue.status || 'planning',
        adminId: adminId,
        teamMembers: this.projectTeamSelection()
      };

      console.log('Creating project with data:', projectData);

      this.projectService.createProject(adminId, projectData)
        .then((projectId) => {
          console.log('Project created with ID:', projectId);
          this.projectForm.reset();
          this.projectTeamSelection.set([]);
          this.projectForm.patchValue({ status: 'planning', teamMembers: [] });
          this.showCreateProjectForm.set(false);
          this.loadAdminProjects();
        })
        .catch((error) => {
          console.error('❌ Error creating project:', error);
          void this.showAlert('Error creating project: ' + error.message, 'error', 'Project Error');
        });
    } else {
      console.warn('Form is invalid');
      this.projectForm.markAllAsTouched();
    }
  }

  async createTestProject() {
    const adminId = this.currentUserId();
    console.log('Creating test project...');
    
    const testProject = {
      name: 'Test Project ' + new Date().getTime(),
      description: 'This is a test project created for debugging',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'planning',
      adminId: adminId,
      teamMembers: []
    };

    try {
      const projectId = await this.projectService.createProject(adminId, testProject);
      console.log('Test project created with ID:', projectId);
      await this.showAlert('Test project created successfully!', 'success', 'Project Created');
      this.loadAdminProjects();
    } catch (error: any) {
      console.error('❌ Failed to create test project:', error);
      await this.showAlert('Error: ' + error.message, 'error', 'Project Error');
    }
  }

  createTask() {
    if (this.taskForm.valid) {
      const adminId = this.currentUserId();
      const {
        projectId,
        assignedTo,
        reminderOffsetsMinutes,
        effortPoints,
        estimatedHours,
        ...taskData
      } = this.taskForm.value;

      console.log('Creating task for project:', projectId);

      const parsedReminderOffsets = this.parseNumberList(reminderOffsetsMinutes);

      this.taskService.createTask(projectId, adminId, assignedTo, {
        ...taskData,
        assignedBy: adminId,
        status: 'todo',
        completionPercentage: 0,
        effortPoints: Number(effortPoints || 0),
        estimatedHours: Number(estimatedHours || 0),
        actualHours: 0,
        reminderOffsetsMinutes: parsedReminderOffsets,
      }).then(() => {
        console.log('Task created successfully');
        this.taskForm.reset();
        this.taskForm.patchValue({
          priority: 'medium',
          effortPoints: 0,
          estimatedHours: 0,
        });
        this.showCreateTaskForm.set(false);
        this.loadAdminProjects();
        this.loadTasks();
      }).catch((error) => {
        console.error('❌ Error creating task:', error);
        void this.showAlert('Error creating task: ' + error.message, 'error', 'Task Error');
      });
    } else {
      console.warn('Task form is invalid');
      this.taskForm.markAllAsTouched();
    }
  }

  async deleteProject(project: Project) {
    const taskCount = project.taskCount || 0;
    const confirmed = await this.showConfirm(
      `Delete "${project.name}"? This will also delete ${taskCount} related task(s).`,
      'Delete Project'
    );

    if (confirmed) {
      console.log('Deleting project:', project.id);
      this.projectService.deleteProject(project.id)
        .then(() => {
          console.log('Project deleted');
          this.loadAdminProjects();
          this.loadTasks();
          this.loadDashboardStats(this.currentUserId());
        })
        .catch((error) => {
          console.error('❌ Error deleting project:', error);
          void this.showAlert('Error deleting project: ' + error.message, 'error', 'Delete Failed');
        });
    }
  }

  async changeProjectStatus(project: Project, event: Event) {
    const selectElement = event.target as HTMLSelectElement | null;
    const nextStatus = (selectElement?.value || project.status) as Project['status'];

    if (nextStatus === project.status) {
      return;
    }

    try {
      await this.projectService.updateProject(project.id, { status: nextStatus });
      this.loadAdminProjects();
      this.loadDashboardStats(this.currentUserId());
      await this.showAlert(`Project status updated to ${nextStatus}.`, 'success', 'Status Updated');
    } catch (error: any) {
      console.error('❌ Error updating project status:', error);
      if (selectElement) {
        selectElement.value = project.status;
      }
      await this.showAlert('Failed to update project status: ' + error.message, 'error', 'Update Failed');
    }
  }

  async deleteTask(taskId: string) {
    if (await this.showConfirm('Are you sure you want to delete this task?', 'Delete Task')) {
      this.taskService.deleteTask(taskId)
        .then(() => {
          this.loadAdminProjects();
          this.loadTasks();
        })
        .catch((error) => {
          console.error('❌ Error deleting task:', error);
          void this.showAlert('Error deleting task: ' + error.message, 'error', 'Delete Failed');
        });
    }
  }

  async editProject(project: Project) {
    const employees = this.employees();

    if (!employees.length) {
      await this.showAlert('No employees available to assign.', 'info', 'No Team Members');
      return;
    }

    const currentTeam = new Set(project.teamMembers || []);
    const optionsText = employees
      .map((employee, index) => {
        const marker = currentTeam.has(employee.id) ? '✓' : ' ';
        const label = employee.name || employee.email || employee.id;
        return `${index + 1}. [${marker}] ${label}`;
      })
      .join('\n');

    const currentSelectionIndices = employees
      .map((employee, index) => currentTeam.has(employee.id) ? String(index + 1) : null)
      .filter(Boolean)
      .join(',');

    const input = await this.showTextInput(
      `Edit team members for "${project.name}"`,
      `Choose employee numbers (comma separated):\n${optionsText}`,
      currentSelectionIndices,
      'textarea'
    );

    if (input === null) {
      return;
    }

    const selectedTeamMembers = this.parseEmployeeSelectionInput(input, employees);

    this.projectService.updateProject(project.id, { teamMembers: selectedTeamMembers })
      .then(() => {
        void this.showAlert('Project team updated successfully.', 'success', 'Team Updated');
        this.loadAdminProjects();
        this.onTaskProjectChanged(this.taskForm.get('projectId')?.value || '');
      })
      .catch((error) => {
        console.error('❌ Error updating project team:', error);
        void this.showAlert('Error updating project team: ' + error.message, 'error', 'Update Failed');
      });
  }

  editTask(task: Task) {
    console.log('Edit task:', task);
    void this.showAlert('Edit functionality coming soon!', 'info', 'Not Yet Available');
  }

  toggleTaskSelection(taskId: string) {
    const selected = new Set(this.selectedTaskIds());
    if (selected.has(taskId)) {
      selected.delete(taskId);
    } else {
      selected.add(taskId);
    }
    this.selectedTaskIds.set(Array.from(selected));
  }

  isTaskSelected(taskId: string): boolean {
    return this.selectedTaskIds().includes(taskId);
  }

  applySavedTaskFilter(filterKey: 'all' | 'my-overdue' | 'due-this-week' | 'unassigned') {
    this.selectedTaskFilter.set(filterKey);
    this.refreshDisplayedTasks();
  }

  private refreshDisplayedTasks() {
    const filter = this.selectedTaskFilter();
    const allTasks = this.tasks();

    if (filter === 'all') {
      this.displayedTasks.set(allTasks);
      return;
    }

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const filtered = allTasks.filter(task => {
      const deadline = new Date(task.deadline);
      switch (filter) {
        case 'my-overdue':
          return task.status !== 'done' && deadline < now;
        case 'due-this-week':
          return deadline >= now && deadline <= weekEnd;
        case 'unassigned':
          return !task.assignedTo || task.assignedTo.trim().length === 0;
        default:
          return true;
      }
    });

    this.displayedTasks.set(filtered);
  }

  async applyBulkUpdate() {
    const selectedIds = this.selectedTaskIds();
    if (!selectedIds.length) {
      return;
    }

    const updates: any = {};
    if (this.bulkStatus) {
      updates.status = this.bulkStatus;
    }
    if (this.bulkPriority) {
      updates.priority = this.bulkPriority;
    }
    if (this.bulkAssignee) {
      updates.assignedTo = this.bulkAssignee;
    }

    if (Object.keys(updates).length === 0) {
      await this.showAlert('Select at least one bulk field to update.', 'info', 'Bulk Update');
      return;
    }

    try {
      await this.taskService.bulkUpdateTasks(
        selectedIds,
        updates,
        this.currentUserId(),
        this.userName(),
        'admin'
      );

      this.selectedTaskIds.set([]);
      this.bulkStatus = '';
      this.bulkPriority = '';
      this.bulkAssignee = '';
      this.loadAdminProjects();
      this.loadTasks();
    } catch (error: any) {
      console.error('❌ Error applying bulk update:', error);
      await this.showAlert('Bulk update failed: ' + error.message, 'error', 'Bulk Update Failed');
    }
  }

  async setTaskRemindersPrompt(task: Task) {
    const currentValue = (task.reminderOffsetsMinutes || []).join(', ');
    const input = await this.showTextInput('Reminders', 'Enter reminder offsets in minutes (comma separated):', currentValue);
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
        'admin'
      );
      this.loadTasks();
    } catch (error: any) {
      console.error('❌ Error updating reminders:', error);
      await this.showAlert('Failed to update reminders: ' + error.message, 'error', 'Reminder Update Failed');
    }
  }

  async logOneHour(taskId: string) {
    try {
      await this.taskService.addActualHours(taskId, 1);
      this.loadTasks();
    } catch (error: any) {
      console.error('❌ Error logging one hour:', error);
      await this.showAlert('Failed to log time: ' + error.message, 'error', 'Time Log Failed');
    }
  }

  openTaskActivity(taskId: string) {
    this.selectedActivityTaskId.set(taskId);
    this.taskService.getTaskActivity(taskId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entries) => this.taskActivities.set(entries),
        error: (error) => {
          console.error('❌ Error loading task activity:', error);
          this.taskActivities.set([]);
        }
      });
  }

  getTaskScore(task: Task): number {
    return this.taskService.getTaskPriorityScore(task);
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

  private parseEmployeeSelectionInput(input: string, employees: User[]): string[] {
    const selectedIndices = input
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item > 0 && item <= employees.length);

    const selectedIds = selectedIndices.map((index) => employees[index - 1].id);
    return Array.from(new Set(selectedIds));
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

  // Keep backward compatibility
  selectConversation(conv: DashboardConversation, event?: Event) {
    this.selectConversationUltimate(conv, event);
  }

  private async markConversationSeen(userId1: string, userId2: string) {
    try {
      await this.chatService.markConversationAsRead(userId1, userId2, this.currentUserId());
      this.loadConversationsUltimate(this.currentUserId());
    } catch (error) {
      console.error('❌ Error marking conversation as seen:', error);
    }
  }

  loadConversations(adminId: string) {
    this.loadConversationsUltimate(adminId);
  }

  // Helper method to scroll chat to bottom
  private scrollToBottom() {
    setTimeout(() => {
      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }

  async sendChatMessage() {
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.warn('Cannot send message: Admin not authenticated');
      return;
    }
    
    const messageContent = this.chatMessage.trim();
    if (!messageContent || !this.selectedConversation()) {
      return;
    }
    
    console.log('Sending message:', this.chatMessage);
    
    try {
      this.chatMessage = '';

      // Use ChatService to send message
      await this.chatService.sendMessage(
        this.currentUserId(),
        this.userName(),
        'admin',
        this.selectedConversation()!.employeeId,
        messageContent
      );

    } catch (error) {
      this.chatMessage = messageContent;
      console.error('❌ Error sending message:', error);
      await this.showAlert('Failed to send message. Please try again.', 'error', 'Chat Error');
    }
  }

  getEmployeeName(employeeId: string): string {
    const employee = this.employees().find((e) => e.id === employeeId);
    return employee?.name || employee?.email || 'Unknown Employee';
  }

  toggleProjectTeamMember(employeeId: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const selected = new Set(this.projectTeamSelection());

    if (checked) {
      selected.add(employeeId);
    } else {
      selected.delete(employeeId);
    }

    const teamMembers = Array.from(selected);
    this.projectTeamSelection.set(teamMembers);
    this.projectForm.patchValue({ teamMembers }, { emitEvent: false });
  }

  isProjectTeamMemberSelected(employeeId: string): boolean {
    return this.projectTeamSelection().includes(employeeId);
  }

  getAssignableEmployeesForSelectedProject(): User[] {
    const projectId = this.taskForm?.get('projectId')?.value;
    if (!projectId) {
      return [];
    }

    const project = this.projects().find((item) => item.id === projectId);
    if (!project) {
      return [];
    }

    const members = new Set(project.teamMembers || []);
    return this.employees().filter((employee) => members.has(employee.id));
  }

  private onTaskProjectChanged(projectId: string) {
    if (!projectId) {
      this.taskForm.patchValue({ assignedTo: '' }, { emitEvent: false });
      return;
    }

    const assignableIds = new Set(this.getAssignableEmployeesForSelectedProject().map((emp) => emp.id));
    const selectedAssignee = this.taskForm.get('assignedTo')?.value;

    if (selectedAssignee && !assignableIds.has(selectedAssignee)) {
      this.taskForm.patchValue({ assignedTo: '' }, { emitEvent: false });
    }
  }

  getTabTitle(): string {
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      projects: 'Projects',
      tasks: 'Tasks',
      chat: 'Chat',
      settings: 'Settings',
    };
    return titles[this.activeTab()] || 'Dashboard';
  }

  toggleCreateProjectForm() {
    console.log('Toggle project form clicked');
    console.log('Current user:', this.authService.getCurrentUser()?.email);
    this.showCreateProjectForm.update((v) => !v);

    if (!this.showCreateProjectForm()) {
      this.projectTeamSelection.set([]);
      this.projectForm.patchValue({ teamMembers: [] }, { emitEvent: false });
    }
  }

  toggleCreateTaskForm() {
    console.log('Toggle task form clicked');
    this.showCreateTaskForm.update((v) => !v);
  }

  logout() {
    console.log('👋 Logging out');
    this.authService.logout();
    this.router.navigate(['/signin']);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}