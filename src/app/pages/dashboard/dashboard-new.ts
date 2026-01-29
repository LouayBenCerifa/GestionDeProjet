import { Component, inject, OnInit, signal, DestroyRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth-service/auth-service';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { ChatService } from '../../services/chat.service';
import { Firestore, collection, getDocs, query, where, addDoc, Timestamp } from '@angular/fire/firestore';
import { collectionData } from '@angular/fire/firestore';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Project, Task, User, AdminDashboardStats } from '../../interfaces/models';

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
            <a href="#dashboard" class="nav-item active" (click)="activeTab.set('dashboard')">
              <span class="icon">📈</span> Dashboard
            </a>
            <a href="#projects" class="nav-item" (click)="activeTab.set('projects')">
              <span class="icon">📁</span> Projects
            </a>
            <a href="#tasks" class="nav-item" (click)="activeTab.set('tasks')">
              <span class="icon">✓</span> Tasks
            </a>
            <a href="#chat" class="nav-item" (click)="activeTab.set('chat')">
              <span class="icon">💬</span> Chat
            </a>
            <a href="#settings" class="nav-item" (click)="activeTab.set('settings')">
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
                  @for (project of dashboardStats()?.projectProgress; track project.projectId) {
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
                </div>
              </div>
            </section>
          }

          <!-- Projects Tab -->
          @if (activeTab() === 'projects') {
            <section class="content">
              <div class="section-header">
                <h2>Manage Projects</h2>
                <button class="btn btn-primary" (click)="toggleCreateProjectForm()">+ New Project</button>
              </div>

              @if (showCreateProjectForm()) {
                <div class="form-card">
                  <h3>Create New Project</h3>
                  <form [formGroup]="projectForm" (ngSubmit)="createProject()" class="form">
                    <input type="text" placeholder="Project Name" formControlName="name" class="input">
                    <textarea placeholder="Description" formControlName="description" class="textarea"></textarea>
                    <div class="date-row">
                      <input type="date" formControlName="startDate" class="input">
                      <input type="date" formControlName="endDate" class="input">
                    </div>
                    <select formControlName="status" class="input">
                      <option value="">Select Status</option>
                      <option value="planning">Planning</option>
                      <option value="in-progress">In Progress</option>
                      <option value="on-hold">On Hold</option>
                    </select>
                    <div class="form-actions">
                      <button type="submit" class="btn btn-primary">Create Project</button>
                      <button type="button" class="btn btn-secondary" (click)="toggleCreateProjectForm()">Cancel</button>
                    </div>
                  </form>
                </div>
              }

              <div class="projects-grid">
                @for (project of projects(); track project.id) {
                  <div class="project-card">
                    <div class="project-header">
                      <h3>{{ project.name }}</h3>
                      <div class="project-actions">
                        <button class="btn-icon" (click)="editProject(project)">✏️</button>
                        <button class="btn-icon" (click)="deleteProject(project.id)">🗑️</button>
                      </div>
                    </div>
                    <p class="project-description">{{ project.description }}</p>
                    <div class="project-meta">
                      <span class="badge" [class.status-planning]="project.status === 'planning'" 
                            [class.status-in-progress]="project.status === 'in-progress'"
                            [class.status-completed]="project.status === 'completed'">
                        {{ project.status | titlecase }}
                      </span>
                      <span>Team: {{ project.teamMembers.length || 0 }} members</span>
                    </div>
                    <div class="progress-bar-container">
                      <div class="progress-bar" [style.width.%]="project.completionPercentage"></div>
                    </div>
                    <p class="progress-text">{{ project.completionPercentage.toFixed(0) }}% complete</p>
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
                      @for (proj of projects(); track proj.id) {
                        <option [value]="proj.id">{{ proj.name }}</option>
                      }
                    </select>

                    <select formControlName="assignedTo" class="input">
                      <option value="">Assign To Employee</option>
                      @for (emp of employees(); track emp.id) {
                        <option [value]="emp.id">{{ emp.name }} ({{ emp.email }})</option>
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
                      <button type="submit" class="btn btn-primary">Create Task</button>
                      <button type="button" class="btn btn-secondary" (click)="toggleCreateTaskForm()">Cancel</button>
                    </div>
                  </form>
                </div>
              }

              <div class="tasks-list">
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
                    @for (conv of conversations(); track conv.id) {
                      <div class="conversation-item" 
                           [class.active]="selectedConversation()?.id === conv.id"
                           (click)="selectConversation(conv)">
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
                  </div>
                </div>

                <div class="chat-main">
                  @if (selectedConversation()) {
                    <div class="chat-header">
                      <h3>Chat with {{ selectedConversation()?.employeeName }}</h3>
                    </div>
                    <div class="messages-container">
                      @for (msg of chatMessages(); track msg.id) {
                        <div class="message" [class.sent]="msg.senderId === currentUserId()">
                          <div class="message-bubble">
                            <p>{{ msg.content }}</p>
                            <small>{{ msg.timestamp | date: 'HH:mm' }}</small>
                          </div>
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
              </div>
            </section>
          }
        </main>
      }
    </div>
  `,
  styles: [`
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
    }

    .denied-icon {
      font-size: 80px;
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

    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 10px;
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

    .status-completed {
      background: #dcfce7;
      color: #166534;
    }

    .progress-text {
      color: #667eea;
      font-weight: 600;
      margin-top: 12px;
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
    }
  `],
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
  conversations = signal<any[]>([]);
  chatMessages = signal<any[]>([]);

  dashboardStats = signal<AdminDashboardStats | null>(null);

  activeTab = signal<'dashboard' | 'projects' | 'tasks' | 'chat' | 'settings'>('dashboard');
  showCreateProjectForm = signal(false);
  showCreateTaskForm = signal(false);
  selectedConversation = signal<any>(null);
  chatMessage = '';

  projectForm!: FormGroup;
  taskForm!: FormGroup;

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserId.set(user.uid);
      this.userName.set(user.displayName || user.email || '');
      this.userEmail.set(user.email || '');
      this.checkUserRole();
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
          this.isAdmin.set(user['role'] === 'admin');
          this.userRole.set(user['role']);

          if (this.isAdmin()) {
            this.loadAdminDashboard();
          }
        }
      });
    }
  }

  loadAdminDashboard() {
    const adminId = this.currentUserId();

    // Load projects
    this.projectService.getAdminProjects(adminId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((projects) => this.projects.set(projects));

    // Load tasks
    const tasksRef = collection(this.firestore, 'tasks');
    collectionData(query(tasksRef), { idField: 'id' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tasks: any) => {
        this.tasks.set(tasks.map((t: any) => ({
          ...t,
          deadline: t.deadline?.toDate ? t.deadline.toDate() : t.deadline,
        })));
      });

    // Load employees
    const usersRef = collection(this.firestore, 'users');
    collectionData(query(usersRef, where('role', '==', 'employee')), { idField: 'id' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((employees: any) => this.employees.set(employees));

    // Load conversations
    this.chatService.getUserConversations(adminId, 'admin')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((conversations) => this.conversations.set(conversations));

    // Load dashboard stats
    this.projectService.getAdminDashboardStats(adminId).then((stats) => {
      this.dashboardStats.set(stats);
    });
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

  createProject() {
    if (this.projectForm.valid) {
      const adminId = this.currentUserId();
      this.projectService.createProject(adminId, {
        ...this.projectForm.value,
        teamMembers: [],
      }).then(() => {
        this.projectForm.reset();
        this.showCreateProjectForm.set(false);
      });
    }
  }

  createTask() {
    if (this.taskForm.valid) {
      const adminId = this.currentUserId();
      const { projectId, assignedTo, ...taskData } = this.taskForm.value;

      this.taskService.createTask(projectId, adminId, assignedTo, {
        ...taskData,
        status: 'todo',
        completionPercentage: 0,
      }).then(() => {
        this.taskForm.reset();
        this.showCreateTaskForm.set(false);
      });
    }
  }

  deleteProject(projectId: string) {
    if (confirm('Are you sure?')) {
      this.projectService.deleteProject(projectId);
    }
  }

  deleteTask(taskId: string) {
    if (confirm('Are you sure?')) {
      this.taskService.deleteTask(taskId);
    }
  }

  editProject(project: Project) {
    console.log('Edit project:', project);
  }

  editTask(task: Task) {
    console.log('Edit task:', task);
  }

  selectConversation(conv: any) {
    this.selectedConversation.set(conv);
    this.chatService.getConversationMessages(this.currentUserId(), conv.employeeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((messages) => this.chatMessages.set(messages));
  }

  async sendChatMessage() {
    if (this.chatMessage.trim() && this.selectedConversation()) {
      await this.chatService.sendMessage(
        this.currentUserId(),
        this.userName(),
        'admin',
        this.selectedConversation().employeeId,
        this.chatMessage
      );
      this.chatMessage = '';
    }
  }

  getEmployeeName(employeeId: string): string {
    return this.employees().find((e) => e.id === employeeId)?.name || 'Unknown';
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
    this.showCreateProjectForm.update((v) => !v);
  }

  toggleCreateTaskForm() {
    this.showCreateTaskForm.update((v) => !v);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/signin']);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
