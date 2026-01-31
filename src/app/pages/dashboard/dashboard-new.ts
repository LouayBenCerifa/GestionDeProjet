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

/* ===== Models ===== */
import {
  Project,
  Task,
  User,
  AdminDashboardStats,
  Conversation
} from '../../interfaces/models';
import { Firestore, collection, collectionData, query, where, getDocs, addDoc, doc, setDoc, getDoc, Timestamp, orderBy, QueryDocumentSnapshot } from '@angular/fire/firestore';
import { Observable, Subscriber, catchError, of, timeout, from } from 'rxjs';

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
          <div class="denied-icon">🚫</div>
          <h1>Access Denied</h1>
          <p>This dashboard is restricted to administrators only.</p>
          <p class="user-role-info">Your role: <strong>{{ userRole() }}</strong></p>
          <button class="back-btn" (click)="goBack()">Go Back to Home</button>
        </div>
      } @else {
        <!-- Sidebar -->
        <aside class="sidebar">
          <div class="sidebar-header">
            <h2 class="logo">📊 GestionPro</h2>
          </div>
          <nav class="sidebar-nav">
            <a class="nav-item" 
               [class.active]="activeTab() === 'dashboard'" 
               (click)="onTabChange('dashboard', $event)">
              <span class="icon">📈</span> Dashboard
            </a>
            
            <a class="nav-item" 
               [class.active]="activeTab() === 'projects'" 
               (click)="onTabChange('projects', $event)">
              <span class="icon">📁</span> Projects
            </a>
            
            <a class="nav-item" 
               [class.active]="activeTab() === 'tasks'" 
               (click)="onTabChange('tasks', $event)">
              <span class="icon">✓</span> Tasks
            </a>
            
            <a class="nav-item" 
               [class.active]="activeTab() === 'chat'" 
               (click)="onTabChange('chat', $event)">
              <span class="icon">💬</span> Chat
            </a>
            
            <a class="nav-item" 
               [class.active]="activeTab() === 'settings'" 
               (click)="onTabChange('settings', $event)">
              <span class="icon">⚙️</span> Settings
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
              <div class="notifications">🔔</div>
              <div class="user-profile">
                <img src="https://ui-avatars.com/api/?name={{ userName() }}" alt="User">
                <div>
                  <p class="user-name">{{ userName() }}</p>
                  <p class="user-role">Administrator</p>
                </div>
              </div>
            </div>
          </header>

          <!-- Dashboard Tab -->
          @if (activeTab() === 'dashboard') {
            <section class="content">
              <!-- Stats Overview -->
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-header">
                    <span class="stat-icon">📊</span>
                    <h3>Total Projects</h3>
                  </div>
                  <p class="stat-value">{{ dashboardStats()?.totalProjects ?? 0 }}</p>
                  <p class="stat-label">Active: {{ dashboardStats()?.activeProjects ?? 0 }}</p>
                </div>

                <div class="stat-card">
                  <div class="stat-header">
                    <span class="stat-icon">✅</span>
                    <h3>Task Completion</h3>
                  </div>
                  <p class="stat-value">{{ (dashboardStats()?.taskCompletionRate ?? 0).toFixed(1) }}%</p>
                  <p class="stat-label">{{ dashboardStats()?.completedTasks ?? 0 }}/{{ dashboardStats()?.totalTasks ?? 0 }} tasks</p>
                </div>

                <div class="stat-card">
                  <div class="stat-header">
                    <span class="stat-icon">👥</span>
                    <h3>Active Employees</h3>
                  </div>
                  <p class="stat-value">{{ dashboardStats()?.activeEmployees ?? 0 }}</p>
                  <p class="stat-label">Team members</p>
                </div>

                <div class="stat-card">
                  <div class="stat-header">
                    <span class="stat-icon">⏳</span>
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
                        <div class="progress-header">
                          <h3>{{ project.projectName }}</h3>
                          <span class="progress-value">{{ project.progress.toFixed(0) }}%</span>
                        </div>
                        <div class="progress-bar-container">
                          <div class="progress-bar" [style.width.%]="project.progress"></div>
                        </div>
                        <div class="progress-meta">
                          <span>{{ project.tasksDone }}/{{ project.tasksTotal }} tasks completed</span>
                          <span>Due: {{ project.endDate | date: 'MMM dd, yyyy' }}</span>
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
                          <button class="btn-icon" (click)="editProject(project)">✏️</button>
                          <button class="btn-icon" (click)="deleteProject(project.id)">🗑️</button>
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
                        <span>Team: {{ (project.teamMembers || []).length }} members</span>
                        <span>Tasks: {{ project.taskCount || 0 }}</span>
                      </div>
                      <div class="progress-bar-container">
                        <div class="progress-bar" [style.width.%]="project.completionPercentage || 0"></div>
                      </div>
                      <p class="progress-text">{{ (project.completionPercentage || 0).toFixed(0) }}% complete</p>
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
                <button class="btn btn-primary" (click)="toggleCreateTaskForm()">+ New Task</button>
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
                      @if (employees().length > 0) {
                        @for (emp of employees(); track emp.id) {
                          <option [value]="emp.id">{{ emp.name }} ({{ emp.email }})</option>
                        }
                      } @else {
                        <option value="" disabled>No employees available</option>
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

                    <div class="form-actions">
                      <button type="submit" class="btn btn-primary" [disabled]="!taskForm.valid || projects().length === 0 || employees().length === 0">Create Task</button>
                      <button type="button" class="btn btn-secondary" (click)="toggleCreateTaskForm()">Cancel</button>
                    </div>
                  </form>
                </div>
              }

              <div class="tasks-list">
                @if (tasks().length > 0) {
                  @for (task of tasks(); track task.id) {
                    <div class="task-card">
                      <div class="task-header">
                        <h3>{{ task.title }}</h3>
                        <span class="priority-badge" [class]="'priority-' + task.priority">{{ task.priority | uppercase }}</span>
                      </div>
                      <p>{{ task.description }}</p>
                      <div class="task-meta">
                        <span>👤 Assigned to: {{ getEmployeeName(task.assignedTo) }}</span>
                        <span>📅 Deadline: {{ task.deadline | date: 'MMM dd, yyyy' }}</span>
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
                      <h3>Chat with {{ selectedConversation()?.employeeName }}</h3>
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
              <div class="settings-card">
                <h3>Admin Profile</h3>
                <p><strong>Name:</strong> {{ userName() }}</p>
                <p><strong>Email:</strong> {{ userEmail() }}</p>
                <p><strong>Role:</strong> Administrator</p>
                <p><strong>User ID:</strong> {{ currentUserId() }}</p>
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
      color: #667eea;
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
      color: #667eea;
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
      background: #f0f4ff;
      color: #667eea;
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

    /* Progress */
    .project-progress-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .progress-item {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .progress-header h3 {
      margin: 0;
      color: #1f2937;
      font-size: 16px;
    }

    .progress-value {
      font-weight: 700;
      color: #667eea;
    }

    .progress-bar-container {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
    }

    .progress-meta {
      display: flex;
      justify-content: space-between;
      color: #6b7280;
      font-size: 13px;
    }

    /* Projects Grid */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .section-header h2 {
      margin: 0;
    }

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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #e5e7eb;
      color: #1f2937;
    }

    .btn-secondary:hover {
      background: #d1d5db;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
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

    /* Form Styles */
    .form-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      margin-bottom: 30px;
    }

    .form-card h3 {
      margin: 0 0 20px;
      color: #1f2937;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .input, .textarea {
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      transition: all 0.3s;
    }

    .input:focus, .textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .textarea {
      min-height: 100px;
      resize: vertical;
    }

    .date-row, .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .date-row label, .form-row label {
      display: block;
      margin-bottom: 8px;
      color: #6b7280;
      font-size: 14px;
      font-weight: 500;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 10px;
    }

    .error {
      color: #ef4444;
      font-size: 12px;
      margin-top: 4px;
      display: block;
    }

    /* Projects & Tasks Grid */
    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
    }

    .project-card, .task-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      transition: all 0.3s;
    }

    .project-card:hover, .task-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }

    .project-header, .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .project-header h3, .task-header h3 {
      margin: 0;
      color: #1f2937;
      font-size: 16px;
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
      flex-wrap: wrap;
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

    .progress-text {
      color: #667eea;
      font-weight: 600;
      margin: 12px 0 8px 0;
    }

    .project-dates {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
      font-size: 12px;
      color: #6b7280;
    }

    /* Task Styles */
    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

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

    .task-meta {
      display: flex;
      gap: 16px;
      color: #6b7280;
      font-size: 13px;
      margin: 12px 0;
    }

    .task-status {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
      font-size: 13px;
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

    .task-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
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

    .project-actions {
      display: flex;
      gap: 8px;
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
    }

    .conversations-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .conversation-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;
    }

    .conversation-item:hover {
      background: #f9fafb;
    }

    .conversation-item.active {
      background: #f0f4ff;
    }

    .conv-avatar {
      flex-shrink: 0;
    }

    .conv-avatar img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }

    .conv-info {
      flex: 1;
      min-width: 0;
    }

    .conv-info h4 {
      margin: 0;
      color: #1f2937;
      font-size: 14px;
      font-weight: 600;
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
      background: #667eea;
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

    .chat-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 20px;
    }

    .chat-header {
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
      background: #667eea;
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

    .empty-conversations {
      text-align: center;
      padding: 20px;
      color: #9ca3af;
    }

    /* Settings */
    .settings-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .settings-card h3 {
      margin: 0 0 20px;
      color: #1f2937;
    }

    .settings-card p {
      margin: 12px 0;
      color: #4b5563;
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

      .date-row, .form-row {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private chatService = inject(ChatService);
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
  employees = signal<User[]>([]);
  conversations = signal<DashboardConversation[]>([]);
  chatMessages = signal<DashboardMessage[]>([]);

  dashboardStats = signal<AdminDashboardStats | null>(null);

  activeTab = signal<'dashboard' | 'projects' | 'tasks' | 'chat' | 'settings'>('dashboard');
  showCreateProjectForm = signal(false);
  showCreateTaskForm = signal(false);
  selectedConversation = signal<DashboardConversation | null>(null);
  chatMessage = '';

  projectForm!: FormGroup;
  taskForm!: FormGroup;

  ngOnInit() {
    console.log('🚀 Admin Dashboard initialized');
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserId.set(user.uid);
      this.userName.set(user.displayName || user.email || 'Admin');
      this.userEmail.set(user.email || '');
      console.log('👤 User loaded:', user.email, 'UID:', user.uid);
      this.checkUserRole();
    } else {
      console.warn('No user found, redirecting to signin');
      this.router.navigate(['/signin']);
    }

    this.initializeForms();
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
          this.isAdmin.set(role === 'admin');
          this.userRole.set(role);
          console.log('🎯 User role:', role, 'Is admin:', this.isAdmin());

          if (this.isAdmin()) {
            this.loadAdminDashboard();
          } else {
            console.warn('User is not admin, redirecting to employee dashboard');
            this.router.navigate(['/dashboard/employee']);
          }
        } else {
          console.warn('No user document found in Firestore');
          this.router.navigate(['/signin']);
        }
      }).catch((error) => {
        console.error('Error checking user role:', error);
      });
    }
  }

  loadAdminDashboard() {
    const adminId = this.currentUserId();
    console.log('📊 Loading admin dashboard for:', adminId);

    if (!adminId) {
      console.error('❌ No admin ID available');
      return;
    }

    // Load projects
    this.loadAdminProjects();

    // Load tasks
    this.loadTasks();

    // Load employees
    this.loadEmployees();

    // Load dashboard stats
    this.loadDashboardStats(adminId);

    // Don't load conversations on init - only when chat tab is selected
  }

  loadAdminProjects() {
    const adminId = this.currentUserId();
    console.log('🔄 Loading projects for admin:', adminId);
    
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
              console.log('📊 Sample project:', {
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
    console.log('📋 Loading tasks...');
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
        console.log('📋 Tasks loaded:', tasks.length);
        this.tasks.set(tasks);
      })
      .catch((error) => {
        console.error('❌ Error loading tasks:', error);
      });
  }

  loadEmployees() {
    console.log('👥 Loading employees...');
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
        console.log('👥 Employees loaded:', employees.length);
        this.employees.set(employees);
      })
      .catch((error) => {
        console.error('❌ Error loading employees:', error);
      });
  }

  loadDashboardStats(adminId: string) {
    console.log('📈 Loading dashboard stats...');
    this.projectService.getAdminDashboardStats(adminId)
      .then((stats) => {
        console.log('📈 Dashboard stats loaded:', stats);
        this.dashboardStats.set(stats);
      })
      .catch((error) => {
        console.error('❌ Error loading dashboard stats:', error);
      });
  }

  // ULTIMATE FIX: Use getDocs() instead of collectionData() to avoid Firestore reference issues
  // Change this in loadConversationsUltimate method:
loadConversationsUltimate(adminId: string) {
  console.log('💬 Loading conversations using getDocs() for admin:', adminId);
  
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
        
        console.log('✅ Conversations loaded with getDocs():', conversations.length);
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
    
    console.log('🎯 Selecting conversation with:', conv.employeeName);
    
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

      // Use getDocs() instead of collectionData()
      from(getDocs(q))
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          catchError((error) => {
            console.error('❌ Error loading messages with getDocs:', error);
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
                senderRole: data['senderRole'] || 'employee',
                content: data['content'] || '',
                timestamp: data['timestamp']?.toDate ? data['timestamp'].toDate() : data['timestamp'],
                isRead: data['isRead'] || false,
                conversationId: data['conversationId'] || ''
              };
            });
            
            console.log('✅ Messages loaded with getDocs():', messages.length);
            this.chatMessages.set(messages);
            
            // Auto-scroll to bottom
            setTimeout(() => {
              this.scrollToBottom();
            }, 100);
          },
          error: (error) => {
            console.error('❌ Subscription error in loadMessagesUltimate:', error);
            this.chatMessages.set([]);
          }
        });
    } catch (error) {
      console.error('❌ Exception in loadMessagesUltimate:', error);
      this.chatMessages.set([]);
    }
  }

  initializeForms() {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      status: ['planning', Validators.required],
    });

    this.taskForm = this.fb.group({
      projectId: ['', Validators.required],
      assignedTo: ['', Validators.required],
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      deadline: ['', Validators.required],
      priority: ['medium', Validators.required],
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

  createProject() {
    if (this.projectForm.valid) {
      const adminId = this.currentUserId();
      const formValue = this.projectForm.value;
      
      console.log('📋 Form values:', formValue);
      
      const projectData = {
        name: formValue.name,
        description: formValue.description,
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        status: formValue.status || 'planning',
        adminId: adminId,
        teamMembers: []
      };

      console.log('📤 Creating project with data:', projectData);

      this.projectService.createProject(adminId, projectData)
        .then((projectId) => {
          console.log('✅ Project created with ID:', projectId);
          this.projectForm.reset();
          this.showCreateProjectForm.set(false);
          this.loadAdminProjects();
        })
        .catch((error) => {
          console.error('❌ Error creating project:', error);
          alert('Error creating project: ' + error.message);
        });
    } else {
      console.warn('Form is invalid');
      this.projectForm.markAllAsTouched();
    }
  }

  async createTestProject() {
    const adminId = this.currentUserId();
    console.log('🧪 Creating test project...');
    
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
      console.log('✅ Test project created with ID:', projectId);
      alert('Test project created successfully!');
      this.loadAdminProjects();
    } catch (error: any) {
      console.error('❌ Failed to create test project:', error);
      alert('Error: ' + error.message);
    }
  }

  createTask() {
    if (this.taskForm.valid) {
      const adminId = this.currentUserId();
      const { projectId, assignedTo, ...taskData } = this.taskForm.value;

      console.log('📝 Creating task for project:', projectId);

      this.taskService.createTask(projectId, adminId, assignedTo, {
        ...taskData,
        assignedBy: adminId,
        status: 'todo',
        completionPercentage: 0,
      }).then(() => {
        console.log('✅ Task created successfully');
        this.taskForm.reset();
        this.showCreateTaskForm.set(false);
      }).catch((error) => {
        console.error('❌ Error creating task:', error);
        alert('Error creating task: ' + error.message);
      });
    } else {
      console.warn('Task form is invalid');
      this.taskForm.markAllAsTouched();
    }
  }

  deleteProject(projectId: string) {
    if (confirm('Are you sure you want to delete this project?')) {
      console.log('🗑️ Deleting project:', projectId);
      this.projectService.deleteProject(projectId)
        .then(() => {
          console.log('✅ Project deleted');
          this.loadAdminProjects();
        })
        .catch((error) => {
          console.error('❌ Error deleting project:', error);
          alert('Error deleting project: ' + error.message);
        });
    }
  }

  deleteTask(taskId: string) {
    if (confirm('Are you sure?')) {
      this.taskService.deleteTask(taskId);
    }
  }

  editProject(project: Project) {
    console.log('Edit project:', project);
    alert('Edit functionality coming soon!');
  }

  editTask(task: Task) {
    console.log('Edit task:', task);
    alert('Edit functionality coming soon!');
  }

  // Keep backward compatibility
  selectConversation(conv: DashboardConversation, event?: Event) {
    this.selectConversationUltimate(conv, event);
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
    
    if (!this.chatMessage.trim() || !this.selectedConversation()) {
      return;
    }
    
    console.log('📤 Sending message:', this.chatMessage);
    
    try {
      // Use ChatService to send message
      await this.chatService.sendMessage(
        this.currentUserId(),
        this.userName(),
        'admin',
        this.selectedConversation()!.employeeId,
        this.chatMessage
      );
      
      this.chatMessage = '';
      
      // Reload messages after sending
      setTimeout(() => {
        if (this.selectedConversation()) {
          this.loadMessagesUltimate(
            this.currentUserId(), 
            this.selectedConversation()!.employeeId
          );
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  }

  getEmployeeName(employeeId: string): string {
    const employee = this.employees().find((e) => e.id === employeeId);
    return employee?.name || employee?.email || 'Unknown Employee';
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