import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth-service/auth-service';
import { TaskService } from '../../services/task.service';
import { ChatService } from '../../services/chat.service';
import { ProjectService } from '../../services/project.service';
import { Firestore, collection, getDocs, query, where, collectionData } from '@angular/fire/firestore';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Task, Project, EmployeeDashboardStats } from '../../interfaces/models';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="dashboard-container">
      @if (!isEmployee()) {
        <div class="access-denied">
          <div class="denied-icon">🚫</div>
          <h1>Access Denied</h1>
          <p>This dashboard is for employees only.</p>
          <button class="back-btn" (click)="goBack()">Go Back</button>
        </div>
      } @else {
        <!-- Sidebar -->
        <aside class="sidebar">
          <div class="sidebar-header">
            <h2 class="logo">📊 GestionPro</h2>
          </div>
          <nav class="sidebar-nav">
            <a href="#tasks" class="nav-item" [class.active]="activeTab() === 'tasks'" 
               (click)="activeTab.set('tasks')">
              <span class="icon">✓</span> My Tasks
            </a>
            <a href="#projects" class="nav-item" [class.active]="activeTab() === 'projects'" 
               (click)="activeTab.set('projects')">
              <span class="icon">📁</span> Projects
            </a>
            <a href="#chat" class="nav-item" [class.active]="activeTab() === 'chat'" 
               (click)="activeTab.set('chat')">
              <span class="icon">💬</span> Chat
            </a>
            <a href="#profile" class="nav-item" [class.active]="activeTab() === 'profile'" 
               (click)="activeTab.set('profile')">
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
              <div class="notifications">
                🔔
                @if (unreadNotifications() > 0) {
                  <span class="notification-badge">{{ unreadNotifications() }}</span>
                }
              </div>
              <div class="user-profile">
                <img [src]="'https://ui-avatars.com/api/?name=' + userName()" alt="User">
                <div>
                  <p class="user-name">{{ userName() }}</p>
                  <p class="user-role">Employee</p>
                </div>
              </div>
            </div>
          </header>

          <!-- Tasks Tab -->
          @if (activeTab() === 'tasks') {
            <section class="content">
              <!-- Stats Overview -->
              <div class="stats-grid">
                <div class="stat-card">
                  <span class="stat-icon">📋</span>
                  <h3>Assigned Tasks</h3>
                  <p class="stat-value">{{ dashboardStats()?.assignedTasks ?? 0 }}</p>
                </div>
                <div class="stat-card">
                  <span class="stat-icon">✅</span>
                  <h3>Completed</h3>
                  <p class="stat-value">{{ dashboardStats()?.completedTasks ?? 0 }}</p>
                </div>
                <div class="stat-card">
                  <span class="stat-icon">⚡</span>
                  <h3>In Progress</h3>
                  <p class="stat-value">{{ dashboardStats()?.inProgressTasks ?? 0 }}</p>
                </div>
                <div class="stat-card">
                  <span class="stat-icon">⚠️</span>
                  <h3>Overdue</h3>
                  <p class="stat-value">{{ dashboardStats()?.overdueTaskCount ?? 0 }}</p>
                </div>
              </div>

              <!-- Task Filters -->
              <div class="filters">
                <button class="filter-btn" [class.active]="selectedFilter() === 'all'" 
                        (click)="selectedFilter.set('all')">All</button>
                <button class="filter-btn" [class.active]="selectedFilter() === 'todo'" 
                        (click)="selectedFilter.set('todo')">To Do</button>
                <button class="filter-btn" [class.active]="selectedFilter() === 'in-progress'" 
                        (click)="selectedFilter.set('in-progress')">In Progress</button>
                <button class="filter-btn" [class.active]="selectedFilter() === 'done'" 
                        (click)="selectedFilter.set('done')">Done</button>
              </div>

              <!-- Tasks List -->
              <div class="tasks-container">
                @if (getFilteredTasks().length === 0) {
                  <div class="empty-state">
                    <p>No tasks yet</p>
                  </div>
                } @else {
                  @for (task of getFilteredTasks(); track task.id) {
                    <div class="task-card" [class]="'status-' + task.status">
                      <div class="task-header">
                        <div class="task-title-section">
                          <h3>{{ task.title }}</h3>
                          <span class="priority-badge" [class]="'priority-' + task.priority">
                            {{ task.priority | uppercase }}
                          </span>
                        </div>
                        <button class="btn-icon" (click)="editTask(task)">✏️</button>
                      </div>

                      <p class="task-description">{{ task.description }}</p>

                      <div class="task-progress">
                        <div class="progress-bar-container">
                          <div class="progress-bar" [style.width.%]="task.completionPercentage"></div>
                        </div>
                        <span class="progress-label">{{ task.completionPercentage }}%</span>
                      </div>

                      <div class="task-meta">
                        <span class="meta-item">
                          <strong>Project:</strong> {{ getProjectName(task.projectId) }}
                        </span>
                        <span class="meta-item">
                          <strong>Deadline:</strong> {{ task.deadline | date: 'MMM dd, yyyy' }}
                        </span>
                      </div>

                      <div class="task-status-selector">
                        <select [value]="task.status" 
                                (change)="updateTaskStatus(task, $event)"
                                class="status-select">
                          <option value="todo">To Do</option>
                          <option value="in-progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>

                      <!-- Comments Section -->
                      <div class="comments-section">
                        <h4>Comments ({{ task.comments.length || 0 }})</h4>
                        <div class="comments-list">
                          @for (comment of task.comments; track comment.id) {
                            <div class="comment">
                              <div class="comment-header">
                                <strong>{{ comment.userName }}</strong>
                                <span class="comment-role">{{ comment.userRole | uppercase }}</span>
                                <small>{{ comment.createdAt | date: 'short' }}</small>
                              </div>
                              <p>{{ comment.content }}</p>
                            </div>
                          }
                        </div>

                        <div class="add-comment">
                          <input type="text" 
                                 placeholder="Add a comment..." 
                                 [(ngModel)]="commentText"
                                 (keydown.enter)="addComment(task)"
                                 class="comment-input">
                          <button (click)="addComment(task)" class="btn-small">Post</button>
                        </div>
                      </div>
                    </div>
                  }
                }
              </div>
            </section>
          }

          <!-- Projects Tab -->
          @if (activeTab() === 'projects') {
            <section class="content">
              <div class="projects-grid">
                @for (project of projects(); track project.id) {
                  <div class="project-card">
                    <div class="project-header">
                      <h3>{{ project.name }}</h3>
                      <span class="project-status" [class]="'status-' + project.status">
                        {{ project.status | titlecase }}
                      </span>
                    </div>
                    <p class="project-description">{{ project.description }}</p>

                    <div class="progress-section">
                      <div class="progress-bar-container">
                        <div class="progress-bar" [style.width.%]="project.completionPercentage"></div>
                      </div>
                      <p class="progress-text">{{ project.completionPercentage.toFixed(0) }}% Complete</p>
                    </div>

                    <div class="project-info">
                      <span>📅 {{ project.startDate | date: 'MMM dd' }} - {{ project.endDate | date: 'MMM dd, yyyy' }}</span>
                      <span>👥 {{ project.teamMembers.length || 0 }} members</span>
                    </div>
                  </div>
                }
              </div>
            </section>
          }

          <!-- Chat Tab -->
          @if (activeTab() === 'chat') {
            <section class="content">
              <div class="chat-container">
                <div class="chat-main">
                  @if (adminConversation()) {
                    <div class="chat-header">
                      <h3>Chat with Admin</h3>
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
                      <p>No admin conversation yet</p>
                    </div>
                  }
                </div>
              </div>
            </section>
          }

          <!-- Profile Tab -->
          @if (activeTab() === 'profile') {
            <section class="content">
              <div class="profile-card">
                <div class="profile-header">
                  <img [src]="'https://ui-avatars.com/api/?name=' + userName() + '&size=120'" alt="Profile">
                  <div class="profile-info">
                    <h2>{{ userName() }}</h2>
                    <p>{{ userEmail() }}</p>
                    <p class="role-badge">Employee</p>
                  </div>
                </div>

                <div class="profile-stats">
                  <div class="stat">
                    <p class="stat-label">Total Tasks</p>
                    <p class="stat-value">{{ dashboardStats()?.assignedTasks ?? 0 }}</p>
                  </div>
                  <div class="stat">
                    <p class="stat-label">Completed</p>
                    <p class="stat-value">{{ dashboardStats()?.completedTasks ?? 0 }}</p>
                  </div>
                  <div class="stat">
                    <p class="stat-label">Completion Rate</p>
                    <p class="stat-value">{{ (dashboardStats()?.taskCompletionRate ?? 0).toFixed(1) }}%</p>
                  </div>
                </div>

                <div class="profile-section">
                  <h3>Account Information</h3>
                  <p><strong>Email:</strong> {{ userEmail() }}</p>
                  <p><strong>Role:</strong> Employee</p>
                  <p><strong>Member Since:</strong> Today</p>
                </div>
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
      position: relative;
    }

    .notification-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #ef4444;
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

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      text-align: center;
    }

    .stat-icon {
      font-size: 28px;
      display: block;
      margin-bottom: 12px;
    }

    .stat-card h3 {
      margin: 0 0 8px;
      color: #6b7280;
      font-size: 14px;
      font-weight: 600;
    }

    .stat-value {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
    }

    /* Filters */
    .filters {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

    .filter-btn {
      padding: 10px 20px;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
      color: #6b7280;
    }

    .filter-btn:hover,
    .filter-btn.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    /* Tasks Container */
    .tasks-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #9ca3af;
      text-align: center;
    }

    .task-card {
      background: white;
      border-left: 4px solid #667eea;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      transition: all 0.3s;
    }

    .task-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }

    .status-done {
      opacity: 0.7;
      border-left-color: #10b981;
    }

    .status-in-progress {
      border-left-color: #f59e0b;
    }

    .status-todo {
      border-left-color: #667eea;
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .task-title-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .task-card h3 {
      margin: 0;
      color: #1f2937;
      font-size: 16px;
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
      background: #fecaca;
      color: #991b1b;
    }

    .priority-urgent {
      background: #fecaca;
      color: #991b1b;
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

    .task-description {
      color: #6b7280;
      font-size: 14px;
      margin: 12px 0;
    }

    .task-progress {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 12px 0;
    }

    .progress-bar-container {
      flex: 1;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
    }

    .progress-label {
      color: #667eea;
      font-weight: 600;
      font-size: 13px;
      min-width: 40px;
    }

    .task-meta {
      display: flex;
      gap: 20px;
      color: #6b7280;
      font-size: 13px;
      margin: 12px 0;
      padding: 12px 0;
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
    }

    .task-status-selector {
      margin: 12px 0;
    }

    .status-select {
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-weight: 600;
      color: #667eea;
    }

    /* Comments */
    .comments-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }

    .comments-section h4 {
      margin: 0 0 12px;
      color: #1f2937;
      font-size: 14px;
    }

    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .comment {
      background: #f9fafb;
      padding: 12px;
      border-radius: 8px;
    }

    .comment-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 12px;
    }

    .comment-header strong {
      color: #1f2937;
    }

    .comment-role {
      background: #dbeafe;
      color: #0369a1;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
    }

    .comment-header small {
      color: #9ca3af;
    }

    .comment p {
      margin: 0;
      color: #6b7280;
      font-size: 13px;
    }

    .add-comment {
      display: flex;
      gap: 8px;
    }

    .comment-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-family: inherit;
      font-size: 13px;
    }

    .btn-small {
      padding: 8px 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.3s;
    }

    .btn-small:hover {
      background: #5568d3;
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
      align-items: start;
      margin-bottom: 12px;
    }

    .project-header h3 {
      margin: 0;
      color: #1f2937;
      font-size: 16px;
    }

    .project-status {
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    .project-status.status-planning {
      background: #dbeafe;
      color: #0369a1;
    }

    .project-status.status-in-progress {
      background: #fed7aa;
      color: #b45309;
    }

    .project-status.status-completed {
      background: #dcfce7;
      color: #166534;
    }

    .project-description {
      color: #6b7280;
      font-size: 13px;
      margin: 12px 0;
    }

    .progress-section {
      margin: 16px 0;
    }

    .progress-text {
      margin-top: 8px;
      color: #667eea;
      font-weight: 600;
      font-size: 13px;
    }

    .project-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: #6b7280;
      font-size: 13px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
    }

    /* Chat */
    .chat-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      display: flex;
      height: 600px;
      overflow: hidden;
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

    /* Profile */
    .profile-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      padding: 30px;
      max-width: 600px;
    }

    .profile-header {
      display: flex;
      gap: 20px;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 30px;
      border-bottom: 1px solid #e5e7eb;
    }

    .profile-header img {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
    }

    .profile-info h2 {
      margin: 0 0 8px;
      color: #1f2937;
    }

    .profile-info p {
      margin: 0;
      color: #6b7280;
    }

    .role-badge {
      margin-top: 12px;
      display: inline-block;
      background: #dbeafe;
      color: #0369a1;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12px;
    }

    .profile-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .stat {
      text-align: center;
    }

    .stat-label {
      margin: 0;
      color: #6b7280;
      font-size: 13px;
    }

    .stat-value {
      margin: 8px 0 0;
      font-size: 28px;
      font-weight: 700;
      color: #667eea;
    }

    .profile-section {
      margin-bottom: 20px;
    }

    .profile-section h3 {
      margin: 0 0 16px;
      color: #1f2937;
    }

    .profile-section p {
      margin: 8px 0;
      color: #6b7280;
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
        padding: 16px;
      }

      .sidebar-nav {
        flex-direction: row;
        flex: 1;
        margin: 0 20px;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .projects-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class EmployeeDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private taskService = inject(TaskService);
  private chatService = inject(ChatService);
  private projectService = inject(ProjectService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // Signals
  isEmployee = signal(false);
  userName = signal('');
  userEmail = signal('');
  currentUserId = signal('');

  tasks = signal<Task[]>([]);
  projects = signal<Project[]>([]);
  chatMessages = signal<any[]>([]);
  adminConversation = signal<any>(null);

  dashboardStats = signal<EmployeeDashboardStats | null>(null);

  activeTab = signal<'tasks' | 'projects' | 'chat' | 'profile'>('tasks');
  selectedFilter = signal<'all' | 'todo' | 'in-progress' | 'done'>('all');
  unreadNotifications = signal(0);

  chatMessage = '';
  commentText = '';

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserId.set(user.uid);
      this.userName.set(user.displayName || user.email || '');
      this.userEmail.set(user.email || '');
      this.checkUserRole();
    }
  }

  checkUserRole() {
    const userId = this.currentUserId();
    if (userId) {
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('uid', '==', userId));

      getDocs(q).then((snap) => {
        if (snap.docs.length > 0) {
          const user = snap.docs[0].data();
          const isEmployee = user['role'] === 'employee';
          this.isEmployee.set(isEmployee);

          if (isEmployee) {
            this.loadEmployeeDashboard();
          }
        }
      });
    }
  }

  loadEmployeeDashboard() {
    const employeeId = this.currentUserId();

    // Load tasks
    this.taskService.getEmployeeTasks(employeeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tasks) => this.tasks.set(tasks));

    // Load projects
    this.projectService.getEmployeeProjects(employeeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((projects) => this.projects.set(projects));

    // Load stats
    this.taskService.getEmployeeDashboardStats(employeeId).then((stats) => {
      this.dashboardStats.set(stats);
    });

    // Load chat with admin
    this.chatService.getUserConversations(employeeId, 'employee')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((conversations) => {
        if (conversations.length > 0) {
          this.adminConversation.set(conversations[0]);
          this.loadChatMessages(conversations[0]);
        }
      });
  }

  loadChatMessages(conversation: any) {
    this.chatService.getConversationMessages(conversation.adminId, this.currentUserId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((messages) => this.chatMessages.set(messages));
  }

  getFilteredTasks(): Task[] {
    const filter = this.selectedFilter();
    if (filter === 'all') {
      return this.tasks();
    }
    return this.tasks().filter((t) => t.status === filter);
  }

  updateTaskStatus(task: Task, event: any) {
    const newStatus = event.target.value as 'todo' | 'in-progress' | 'done';
    this.taskService.updateTaskStatus(task.id, newStatus, task.completionPercentage);
  }

  editTask(task: Task) {
    console.log('Edit task:', task);
  }

  addComment(task: Task) {
    if (this.commentText.trim()) {
      this.taskService.addCommentToTask(
        task.id,
        this.currentUserId(),
        this.userName(),
        'employee',
        this.commentText
      );
      this.commentText = '';
    }
  }

  sendChatMessage() {
    if (this.chatMessage.trim() && this.adminConversation()) {
      this.chatService.sendMessage(
        this.currentUserId(),
        this.userName(),
        'employee',
        this.adminConversation().adminId,
        this.chatMessage
      );
      this.chatMessage = '';
    }
  }

  getProjectName(projectId: string): string {
    return this.projects().find((p) => p.id === projectId)?.name || 'Unknown';
  }

  getTabTitle(): string {
    const titles: Record<string, string> = {
      tasks: 'My Tasks',
      projects: 'Projects',
      chat: 'Chat',
      profile: 'Profile',
    };
    return titles[this.activeTab()] || 'Dashboard';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/signin']);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
