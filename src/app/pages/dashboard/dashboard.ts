import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth-service/auth-service';
import { 
  Firestore, 
  collection, 
  collectionData, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  Timestamp,
  query,
  where,
  getDocs,
  getDoc,
  setDoc
} from '@angular/fire/firestore';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: Date;
  userId: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  // CommonModule is already present, but if not, ensure it is included for *ngIf support
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
        <!-- Original dashboard content -->
        
        <!-- Header -->
        <header class="dashboard-header">
          <div class="header-content">
            <h1>Welcome, {{ userName() }}! 👋</h1>
            <p>Here's an overview of your tasks and progress.</p>
            <span class="admin-badge">Administrator</span>
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

        <!-- Add Task Form -->
        <div class="add-task-section">
          <div class="section-header">
            <h2>Add New Task</h2>
          </div>
          <form [formGroup]="taskForm" (ngSubmit)="addNewTask()" class="add-task-form">
            <input 
              type="text" 
              placeholder="Task title" 
              formControlName="title"
              class="task-input"
            >
            @if (taskForm.get('title')?.invalid && taskForm.get('title')?.touched) {
              <small class="error-text">Title is required (min 3 characters)</small>
            }
            <textarea 
              placeholder="Task description (optional)" 
              formControlName="description"
              class="task-textarea"
            ></textarea>
            <button 
              type="submit" 
              class="add-task-btn" 
              [disabled]="taskForm.invalid || addingTask()"
            >
              @if (addingTask()) {
                <span class="spinner-small"></span> Adding...
              } @else {
                + Add Task
              }
            </button>
          </form>
        </div>

        <!-- Tasks Section -->
        <div class="tasks-section">
          <div class="section-header">
            <h2>Your Tasks</h2>
            <button class="clear-btn" (click)="clearLocalTasks()" *ngIf="usingLocalTasks()">Clear Local Tasks</button>
            <button class="retry-btn" (click)="retryFirebaseConnection()" *ngIf="dbError()">Retry Firebase</button>
          </div>


          <!-- Tasks List -->
          @if (tasks().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <h3>No tasks yet</h3>
              <p>Start by adding your first task!</p>
            </div>
          } @else {
            <div class="tasks-list">
              @for (task of tasks(); track task.id) {
                <div class="task-card" [class.completed]="task.completed">
                  <div class="task-checkbox">
                    <input 
                      type="checkbox" 
                      [checked]="task.completed" 
                      (change)="toggleTask(task)"
                    >
                  </div>
                  <div class="task-content">
                    <h4 [class.completed-text]="task.completed">{{ task.title }}</h4>
                    <p [class.completed-text]="task.completed">{{ task.description }}</p>
                    <span class="task-date">{{ task.createdAt | date:'mediumDate' }}</span>
                    @if (usingLocalTasks()) {
                      <span class="local-badge">Local</span>
                    }
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
            <p><strong>Role:</strong> <span class="role-badge admin">Administrator</span></p>
            <p><strong>Email:</strong> {{ userEmail() }}</p>
            <p><strong>Member since:</strong> {{ memberSince() | date:'longDate' }}</p>
            <p><strong>Storage:</strong> {{ usingLocalTasks() ? 'Local Storage' : 'Firebase Firestore' }}</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: #f5f7fa;
      padding: 30px;
    }

    .access-denied {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 70vh;
      text-align: center;
      padding: 40px;
    }
    
    .denied-icon {
      font-size: 80px;
      margin-bottom: 20px;
    }
    
    .access-denied h1 {
      color: #ff4757;
      margin-bottom: 15px;
    }
    
    .access-denied p {
      color: #7f8c8d;
      margin-bottom: 10px;
      max-width: 500px;
    }
    
    .user-role-info {
      background: #f8f9fa;
      padding: 10px 20px;
      border-radius: 8px;
      margin-top: 20px !important;
    }
    
    .back-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 30px;
      transition: background 0.3s;
    }
    
    .back-btn:hover {
      background: #5a6fd8;
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

    .admin-badge {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 20px;
      margin-top: 8px;
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

    .add-task-section {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 40px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    .add-task-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .task-input, .task-textarea {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      font-family: inherit;
    }

    .task-input:focus, .task-textarea:focus {
      outline: none;
      border-color: #667eea;
    }

    .error-text {
      color: #ff4757;
      font-size: 12px;
      margin-top: -5px;
    }

    .task-textarea {
      min-height: 80px;
      resize: vertical;
    }

    .add-task-btn {
      align-self: flex-start;
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .add-task-btn:hover:not(:disabled) {
      background: #5a6fd8;
    }

    .add-task-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinner-small {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
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

    .clear-btn, .retry-btn {
      background: #95a5a6;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      margin-left: 10px;
    }

    .retry-btn {
      background: #667eea;
    }

    .clear-btn:hover {
      background: #7f8c8d;
    }

    .retry-btn:hover {
      background: #5a6fd8;
    }

    .error-state {
      background: #ffeaea;
      border: 1px solid #ff4757;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      text-align: center;
    }

    .error-icon {
      font-size: 40px;
      margin-bottom: 10px;
    }

    .error-state h3 {
      color: #ff4757;
      margin-bottom: 10px;
    }

    .error-state p {
      color: #666;
      margin-bottom: 5px;
    }

    .error-detail {
      font-size: 12px;
      color: #999;
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
      position: relative;
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
      margin-right: 10px;
    }

    .local-badge {
      background: #95a5a6;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
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

    .role-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 8px;
    }
    
    .role-badge.admin {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  // User information
  userName = signal('User');
  userEmail = signal('');
  memberSince = signal(new Date());
  userId = signal('');
  userRole = signal('user');
  isAdmin = signal(false);

  // Task management
  tasks = signal<Task[]>([]);
  addingTask = signal(false);
  dbError = signal('');
  usingLocalTasks = signal(false);

  // Form
  taskForm!: FormGroup;

  // Computed signals
  totalTasks = () => this.tasks().length;
  completedTasks = () => this.tasks().filter(task => task.completed).length;
  pendingTasks = () => this.tasks().filter(task => !task.completed).length;

  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      this.router.navigate(['/signin']);
      return;
    }

    // Check user role from Firestore
    await this.checkUserRole(user.uid);
    
    // If not admin, stop here
    if (!this.isAdmin()) {
      // Still set basic user info for the access denied view
      this.userEmail.set(user.email || '');
      this.userName.set(user.email?.split('@')[0] || 'User');
      this.userId.set(user.uid);
      this.memberSince.set(new Date(user.metadata.creationTime || Date.now()));
      return;
    }

    // Set user info for admin
    this.userEmail.set(user.email || '');
    this.userName.set(user.email?.split('@')[0] || 'User');
    this.userId.set(user.uid);
    this.memberSince.set(new Date(user.metadata.creationTime || Date.now()));

    // Initialize form
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['']
    });

    // Try to load tasks from Firestore, fallback to local if fails
    this.loadTasksFromFirestore(user.uid);
  }

  // Check user role from Firestore 'users' collection
  async checkUserRole(userId: string) {
    try {
      console.log('Checking user role for:', userId);
      
      const userDocRef = doc(this.firestore, 'users', userId);
      const userSnap = await getDoc(userDocRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const role = userData['role'] || 'user';
        console.log('User role found:', role);
        
        this.userRole.set(role);
        this.isAdmin.set(role === 'admin');
      } else {
        console.log('User document not found, creating default...');
        // User document doesn't exist, create one with default 'user' role
        await this.createUserDocument(userId);
        this.userRole.set('user');
        this.isAdmin.set(false);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      this.userRole.set('user');
      this.isAdmin.set(false);
    }
  }

  // Create user document if it doesn't exist
  async createUserDocument(userId: string) {
    try {
      const userDocRef = doc(this.firestore, 'users', userId);
      const user = this.authService.getCurrentUser();
      
      await setDoc(userDocRef, {
        uid: userId,
        email: user?.email || '',
        displayName: user?.displayName || '',
        role: 'user', // Default role
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      console.log('User document created with default role: user');
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  }

  // Try loading from Firestore, fallback to local storage
  async loadTasksFromFirestore(userId: string) {
    this.dbError.set('');
    this.usingLocalTasks.set(false);
    
    try {
      console.log('Loading tasks from Firestore for user:', userId);
      
      const tasksCollection = collection(this.firestore, 'tasks');
      const userTasksQuery = query(tasksCollection, where('userId', '==', userId));
      
      // Try using getDocs first for better error handling
      try {
        const querySnapshot = await getDocs(userTasksQuery);
        
        if (!querySnapshot.empty) {
          const userTasks = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data['title'] || '',
              description: data['description'] || '',
              completed: data['completed'] || false,
              createdAt: data['createdAt']?.toDate() || new Date(),
              userId: data['userId']
            };
          });
          
          this.tasks.set(userTasks);
          this.usingLocalTasks.set(false);
          console.log('Loaded', userTasks.length, 'tasks from Firestore');
          
          // Now set up real-time listener
          this.setupFirestoreListener(userId);
        } else {
          console.log('No tasks found in Firestore, checking local storage');
          this.loadTasksFromLocalStorage(userId);
        }
      } catch (firestoreError) {
        console.error('Firestore query error:', firestoreError);
        this.handleFirestoreError(firestoreError, userId);
      }
      
    } catch (error) {
      console.error('Firestore initialization error:', error);
      this.handleFirestoreError(error, userId);
    }
  }

  // Set up real-time Firestore listener
  setupFirestoreListener(userId: string) {
    try {
      const tasksCollection = collection(this.firestore, 'tasks');
      const userTasksQuery = query(tasksCollection, where('userId', '==', userId));
      
      collectionData(userTasksQuery, { idField: 'id' })
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          catchError(error => {
            console.warn('Firestore listener error:', error);
            this.dbError.set('Realtime updates disabled: ' + error.message);
            // Don't fallback to local here, just disable realtime updates
            return of([]);
          })
        )
        .subscribe({
          next: (tasks: any[]) => {
            if (tasks.length > 0) {
              const userTasks = tasks.map(task => ({
                id: task.id,
                title: task.title || '',
                description: task.description || '',
                completed: task.completed || false,
                createdAt: task.createdAt?.toDate() || new Date(),
                userId: task.userId
              }));
              
              this.tasks.set(userTasks);
              this.usingLocalTasks.set(false);
              this.dbError.set('');
            }
          }
        });
    } catch (error) {
      console.error('Error setting up Firestore listener:', error);
    }
  }

  // Handle Firestore errors
  private handleFirestoreError(error: any, userId: string) {
    const errorMessage = error.message || 'Unknown Firestore error';
    console.warn('Firestore connection failed:', errorMessage);
    
    this.dbError.set('Firestore: ' + errorMessage);
    this.usingLocalTasks.set(true);
    this.loadTasksFromLocalStorage(userId);
  }

  // Load tasks from local storage as fallback
  loadTasksFromLocalStorage(userId: string) {
    try {
      const storedTasks = localStorage.getItem(`tasks_${userId}`);
      if (storedTasks) {
        const tasks = JSON.parse(storedTasks);
        this.tasks.set(tasks.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt)
        })));
        console.log('Loaded', tasks.length, 'tasks from local storage');
      } else {
        console.log('No tasks found in local storage');
      }
    } catch (error) {
      console.error('Error loading from local storage:', error);
    }
  }

  // Save tasks to local storage
  saveTasksToLocalStorage(userId: string, tasks: Task[]) {
    try {
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  }

  // Add new task (try Firestore first, fallback to local)
  async addNewTask() {
    if (this.taskForm.invalid) return;

    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.addingTask.set(true);

    const newTask = {
      title: this.taskForm.value.title,
      description: this.taskForm.value.description,
      completed: false,
      createdAt: Timestamp.now(),
      userId: user.uid
    };

    // Try Firestore first
    if (!this.usingLocalTasks()) {
      try {
        const tasksCollection = collection(this.firestore, 'tasks');
        const docRef = await addDoc(tasksCollection, newTask);
        
        // Add to local state with Firestore document ID
        const taskWithId: Task = {
          id: docRef.id,
          title: newTask.title,
          description: newTask.description,
          completed: newTask.completed,
          createdAt: newTask.createdAt.toDate(),
          userId: newTask.userId
        };
        
        this.tasks.update(tasks => [taskWithId, ...tasks]);
        this.taskForm.reset();
        this.addingTask.set(false);
        console.log('Task added to Firestore with ID:', docRef.id);
        return;
      } catch (error) {
        console.warn('Failed to add task to Firestore:', error);
        this.usingLocalTasks.set(true);
        this.dbError.set('Failed to save to Firestore. Using local storage.');
      }
    }

    // Fallback to local storage
    const taskId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const localTask: Task = {
      id: taskId,
      title: newTask.title,
      description: newTask.description,
      completed: newTask.completed,
      createdAt: new Date(),
      userId: newTask.userId
    };

    // Update local state
    this.tasks.update(tasks => [localTask, ...tasks]);
    
    // Save to local storage
    this.saveTasksToLocalStorage(user.uid, this.tasks());

    // Reset form
    this.taskForm.reset();
    this.addingTask.set(false);
    console.log('Task added to local storage with ID:', taskId);
  }

  // Toggle task completion
  async toggleTask(task: Task) {
    const updatedTask = { ...task, completed: !task.completed };
    
    // Update local state immediately for better UX
    this.tasks.update(tasks => 
      tasks.map(t => t.id === task.id ? updatedTask : t)
    );

    // Try to update in Firestore
    if (!this.usingLocalTasks()) {
      try {
        const taskRef = doc(this.firestore, 'tasks', task.id);
        await updateDoc(taskRef, { completed: updatedTask.completed });
        console.log('Task updated in Firestore:', task.id);
      } catch (error) {
        console.warn('Failed to update task in Firestore:', error);
        // Revert if Firestore fails
        this.tasks.update(tasks => 
          tasks.map(t => t.id === task.id ? task : t)
        );
      }
    } else {
      // Update in local storage
      const user = this.authService.getCurrentUser();
      if (user) {
        this.saveTasksToLocalStorage(user.uid, this.tasks());
      }
    }
  }

  // Delete task
  async deleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    // Store the task to restore if deletion fails
    const taskToDelete = this.tasks().find(task => task.id === taskId);
    
    // Update local state immediately for better UX
    this.tasks.update(tasks => tasks.filter(task => task.id !== taskId));

    // Try to delete from Firestore
    if (!this.usingLocalTasks()) {
      try {
        const taskRef = doc(this.firestore, 'tasks', taskId);
        await deleteDoc(taskRef);
        console.log('Task deleted from Firestore:', taskId);
      } catch (error) {
        console.warn('Failed to delete task from Firestore:', error);
        // Restore task if deletion failed
        if (taskToDelete) {
          this.tasks.update(tasks => [...tasks, taskToDelete]);
        }
      }
    } else {
      // Update in local storage
      const user = this.authService.getCurrentUser();
      if (user) {
        this.saveTasksToLocalStorage(user.uid, this.tasks());
      }
    }
  }

  // Clear local tasks
  clearLocalTasks() {
    if (confirm('Clear all local tasks?')) {
      this.tasks.set([]);
      const user = this.authService.getCurrentUser();
      if (user) {
        localStorage.removeItem(`tasks_${user.uid}`);
      }
    }
  }

  // Retry Firebase connection
  retryFirebaseConnection() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.dbError.set('');
      this.loadTasksFromFirestore(user.uid);
    }
  }

  // Go back to home page
  goBack() {
    this.router.navigate(['/signin']);
  }

  logout() {
    this.authService.logout();
  }
}