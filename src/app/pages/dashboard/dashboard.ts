import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth-service/auth-service';

interface Task {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  createdAt: Date;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-content">
          <h1>Welcome, {{ userName() }}! 👋</h1>
          <p>Here's an overview of your tasks and progress.</p>
        </div>
        <button class="logout-btn" (click)="logout()">Logout</button>
      </header>

      <!-- Stats Cards -->
      <div class="stats-container">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-info">
            <h3>{{ totalTasks() }}</h3>
            <p>Total Tasks</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <h3>{{ completedTasks() }}</h3>
            <p>Completed</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <h3>{{ pendingTasks() }}</h3>
            <p>Pending</p>
          </div>
        </div>
      </div>

      <!-- Tasks Section -->
      <div class="tasks-section">
        <div class="section-header">
          <h2>Your Tasks</h2>
          <button class="add-task-btn" (click)="addNewTask()">+ Add Task</button>
        </div>

        <!-- Tasks List -->
        @if (tasks().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <h3>No tasks yet</h3>
            <p>Start by adding your first task!</p>
            <button class="primary-btn" (click)="addNewTask()">Create Your First Task</button>
          </div>
        } @else {
          <div class="tasks-list">
            @for (task of tasks(); track task.id) {
              <div class="task-card" [class.completed]="task.completed">
                <div class="task-checkbox">
                  <input 
                    type="checkbox" 
                    [checked]="task.completed" 
                    (change)="toggleTask(task.id)"
                  >
                </div>
                <div class="task-content">
                  <h4 [class.completed-text]="task.completed">{{ task.title }}</h4>
                  <p [class.completed-text]="task.completed">{{ task.description }}</p>
                  <span class="task-date">{{ task.createdAt | date:'mediumDate' }}</span>
                </div>
                <button class="delete-btn" (click)="deleteTask(task.id)">🗑️</button>
              </div>
            }
          </div>
        }
      </div>

      <!-- User Info -->
      <div class="user-info-card">
        <div class="user-avatar">
          {{ userName().charAt(0).toUpperCase() }}
        </div>
        <div class="user-details">
          <h3>Account Information</h3>
          <p><strong>Email:</strong> {{ userEmail() }}</p>
          <p><strong>Member since:</strong> {{ memberSince() | date:'longDate' }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: #f5f7fa;
      padding: 30px;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
    }

    .header-content h1 {
      color: #2c3e50;
      margin-bottom: 8px;
      font-size: 32px;
    }

    .header-content p {
      color: #7f8c8d;
      font-size: 16px;
    }

    .logout-btn {
      background: #ff4757;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s;
    }

    .logout-btn:hover {
      background: #ff3742;
    }

    .stats-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      display: flex;
      align-items: center;
      gap: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      transition: transform 0.3s;
    }

    .stat-card:hover {
      transform: translateY(-5px);
    }

    .stat-icon {
      font-size: 40px;
    }

    .stat-info h3 {
      font-size: 32px;
      color: #2c3e50;
      margin: 0;
    }

    .stat-info p {
      color: #7f8c8d;
      margin: 5px 0 0 0;
    }

    .tasks-section {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 40px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
    }

    .section-header h2 {
      color: #2c3e50;
      margin: 0;
    }

    .add-task-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s;
    }

    .add-task-btn:hover {
      background: #5a6fd8;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }

    .empty-icon {
      font-size: 60px;
      margin-bottom: 20px;
    }

    .empty-state h3 {
      color: #2c3e50;
      margin-bottom: 10px;
    }

    .empty-state p {
      color: #7f8c8d;
      margin-bottom: 25px;
    }

    .primary-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.3s;
    }

    .primary-btn:hover {
      opacity: 0.9;
    }

    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .task-card {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      padding: 20px;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      transition: all 0.3s;
    }

    .task-card:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
    }

    .task-card.completed {
      background: #f8f9fa;
      border-color: #2ecc71;
    }

    .task-checkbox input {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .task-content {
      flex: 1;
    }

    .task-content h4 {
      color: #2c3e50;
      margin: 0 0 8px 0;
      font-size: 18px;
    }

    .task-content h4.completed-text {
      color: #95a5a6;
      text-decoration: line-through;
    }

    .task-content p {
      color: #7f8c8d;
      margin: 0 0 10px 0;
      font-size: 14px;
    }

    .task-content p.completed-text {
      color: #bdc3c7;
    }

    .task-date {
      color: #95a5a6;
      font-size: 12px;
    }

    .delete-btn {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #ff4757;
      opacity: 0.7;
      transition: opacity 0.3s;
    }

    .delete-btn:hover {
      opacity: 1;
    }

    .user-info-card {
      background: white;
      border-radius: 12px;
      padding: 30px;
      display: flex;
      align-items: center;
      gap: 25px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    .user-avatar {
      width: 70px;
      height: 70px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
      font-weight: bold;
    }

    .user-details h3 {
      color: #2c3e50;
      margin: 0 0 15px 0;
    }

    .user-details p {
      color: #7f8c8d;
      margin: 8px 0;
    }

    .user-details strong {
      color: #2c3e50;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  // User information
  userName = signal('User');
  userEmail = signal('');
  memberSince = signal(new Date());

  // Task management
  tasks = signal<Task[]>([
    { id: 1, title: 'Complete Angular project', description: 'Finish the authentication system', completed: true, createdAt: new Date('2024-01-20') },
    { id: 2, title: 'Design dashboard UI', description: 'Create responsive dashboard layout', completed: true, createdAt: new Date('2024-01-21') },
    { id: 3, title: 'Implement task management', description: 'Add CRUD operations for tasks', completed: false, createdAt: new Date('2024-01-22') },
    { id: 4, title: 'Write documentation', description: 'Document the project structure and APIs', completed: false, createdAt: new Date('2024-01-23') },
  ]);

  // Computed signals
  totalTasks = () => this.tasks().length;
  completedTasks = () => this.tasks().filter(task => task.completed).length;
  pendingTasks = () => this.tasks().filter(task => !task.completed).length;

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      this.router.navigate(['/signin']);
      return;
    }

    // Set user info
    this.userEmail.set(user.email || '');
    this.userName.set(user.email?.split('@')[0] || 'User');
    this.memberSince.set(new Date(user.metadata.creationTime || Date.now()));
  }

  logout() {
    this.authService.logout();
  }

  toggleTask(taskId: number) {
    this.tasks.update(tasks => 
      tasks.map(task => 
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  }

  deleteTask(taskId: number) {
    this.tasks.update(tasks => tasks.filter(task => task.id !== taskId));
  }

  addNewTask() {
    const newTask: Task = {
      id: Date.now(),
      title: 'New Task',
      description: 'Task description here',
      completed: false,
      createdAt: new Date()
    };
    
    this.tasks.update(tasks => [newTask, ...tasks]);
  }
}