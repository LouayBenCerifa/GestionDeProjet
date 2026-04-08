import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef
} from '@angular/core';
import { NotificationService, Notification } from '../../../../services/api/notification-api.service';

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
import { AuthService } from '../../../../services/auth-service/auth-service';
import { ProjectService } from '../../../../services/api/project-api.service';
import { TaskService } from '../../../../services/api/task-api.service';
import { AppSidebarComponent, AppNavItem } from '../../../../layout/sidebar/sidebar.component';
import { AppTopbarComponent } from '../../../../layout/header/header.component';
import { AppNotificationsPanelComponent } from '../../../../features/shared-features/notifications/components/notification-list/notifications-panel.component';
import {
  EmployeeDashboardTabComponent,
  EmployeeTasksTabComponent,
  EmployeeProjectsTabComponent,
  EmployeeChatTabComponent,
  EmployeeProfileTabComponent,
} from '../employee-tabs';
import { EmployeeDashboardDataService } from '../../../../services/dashboard/employee-dashboard-data.service';
import { TaskActionsFacadeService } from '../../../../services/dashboard/task-actions-facade.service';
import { DashboardDialogService } from '../../../../services/dashboard/dashboard-dialog.service';
import { DashboardNotificationService } from '../../../../services/dashboard/dashboard-notification.service';
import { DashboardUtilsService } from '../../../../services/dashboard/dashboard-utils.service';
import { EmployeeProfileFacade } from '../../services/employee-profile.facade';
import { EmployeeChatFacade } from '../../services/employee-chat.facade';

/* ===== Models ===== */
import {
  Project,
  Task,
  User,
  TaskActivityEntry
} from '../../../../models/models';

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
  selector: 'app-employee-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AppSidebarComponent,
    AppTopbarComponent,
    AppNotificationsPanelComponent,
    EmployeeDashboardTabComponent,
    EmployeeTasksTabComponent,
    EmployeeProjectsTabComponent,
    EmployeeChatTabComponent,
    EmployeeProfileTabComponent
  ],
  templateUrl: './employee-dashboard.component.html',
  styles: ``
})
export class EmployeeDashboardPageComponent implements OnInit {
 private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private notificationService = inject(NotificationService);
  private employeeDashboardDataService = inject(EmployeeDashboardDataService);
  private employeeChatFacade = inject(EmployeeChatFacade);
  private taskActionsFacadeService = inject(TaskActionsFacadeService);
  private dashboardDialogService = inject(DashboardDialogService);
  private dashboardNotificationService = inject(DashboardNotificationService);
  private dashboardUtilsService = inject(DashboardUtilsService);
  private employeeProfileFacade = inject(EmployeeProfileFacade);
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
  readonly sidebarItems: AppNavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'tasks', label: 'My Tasks', icon: 'task_alt' },
    { key: 'projects', label: 'My Projects', icon: 'folder' },
    { key: 'chat', label: 'Chat with Admin', icon: 'chat' },
    { key: 'profile', label: 'Profile', icon: 'person' }
  ];
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
              this.tasks.set(tasks);
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

   private loadTasksDirectly(employeeId: string) {
    console.log('Loading tasks directly for employee:', employeeId);

    this.employeeDashboardDataService
      .getEmployeeTasksDirect(employeeId)
      .then((tasks) => {
        console.log('📥 Tasks loaded directly:', tasks.length);
        this.tasks.set(tasks);
        this.updateDashboardStats();
      })
      .catch((error: any) => {
        console.error('❌ Error loading tasks directly:', error);
      });
  }

  loadAdmins() {
    console.log('👑 Loading administrators...');

    this.employeeDashboardDataService
      .getAdmins()
      .then((admins) => {
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

    this.employeeDashboardDataService
      .getEmployeeInfo(employeeId)
      .then((info) => {
        if (info) {
          this.employeeInfo.set(info);
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

    this.employeeChatFacade
      .loadConversations(employeeId, this.userName())
      .then((conversations) => {
        console.log('Conversations loaded:', conversations.length);
        this.conversations.set(conversations as DashboardConversation[]);
      })
      .catch((error: any) => {
        console.error('❌ Error loading conversations:', error);
        this.conversations.set([]);
      });
  }

  loadMessages(userId1: string, userId2: string) {
    this.employeeChatFacade.loadMessages(userId1, userId2, {
      onMessages: (messages) => this.chatMessages.set(messages as DashboardMessage[]),
      onAfterLoad: () => {
        void this.markConversationSeen(userId1, userId2);
      },
      onError: () => this.chatMessages.set([])
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

  onSidebarTabChange(tab: string) {
    this.onTabChange(tab as 'dashboard' | 'projects' | 'tasks' | 'chat' | 'profile');
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
    return this.dashboardUtilsService.isTaskOverdue(task);
  }

  getUnreadCount(adminId: string): number {
    const conv = this.conversations().find(c => c.adminId === adminId);
    return conv?.unreadCount || 0;
  }

  getNotificationDate(value: any): Date {
    return this.dashboardNotificationService.getNotificationDate(value);
  }

  // UI Interaction Methods
  toggleNotifications() {
    const shouldOpen = !this.showNotifications();
    this.showNotifications.set(shouldOpen);

    if (shouldOpen) {
      void this.markAllNotificationsAsRead();
    }
  }

  async markAsRead(notificationId: string) {
    try {
      await this.dashboardNotificationService.markAsRead(notificationId);
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
      await this.dashboardNotificationService.clearAllForUser(userId);
      this.notifications.set([]);
    } catch (error: any) {
      console.error('❌ Error clearing notifications:', error);
    }
  }

  private async markAllNotificationsAsRead() {
    const userId = this.currentUserId();
    if (!userId) {
      return;
    }

    const hasUnread = this.notifications().some(notification => !notification.read);
    if (!hasUnread) {
      return;
    }

    this.notifications.update(items => items.map(item => ({ ...item, read: true })));

    try {
      await this.dashboardNotificationService.markAllAsRead(userId);
    } catch (error: any) {
      console.error('❌ Error auto-marking notifications as read:', error);
      this.loadNotifications();
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
    void this.taskActionsFacadeService
      .updateTaskProgress(task, this.currentUserId(), () => this.loadEmployeeTasks(this.currentUserId()))
      .catch((error: any) => {
        void this.showAlert(error.message || 'Error updating task.', 'error', 'Task Error');
      });
  }

  updateTaskProgressFromRange(task: Task, event: any) {
    const newProgress = parseInt(event.target.value, 10);

    void this.taskActionsFacadeService
      .updateTaskProgressFromRange(task, newProgress, () => this.loadEmployeeTasks(this.currentUserId()))
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
    await this.taskActionsFacadeService
      .addCommentWithPrompt(task, this.currentUserId(), this.userName(), () => this.loadEmployeeTasks(this.currentUserId()))
      .catch(async (error: any) => {
        await this.showAlert(error.message || 'Error adding comment.', 'error', 'Comment Error');
      });
  }

  addCommentToTask(task: Task, inputElement: HTMLInputElement) {
    const comment = inputElement.value.trim();
    if (comment) {
      void this.taskActionsFacadeService
        .addComment(task, this.currentUserId(), this.userName(), comment, () => {
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
    return this.taskActionsFacadeService.getTaskScore(task);
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
    await this.taskActionsFacadeService
      .setTaskRemindersPrompt(
        task,
        this.currentUserId(),
        this.userName(),
        'employee',
        () => this.loadEmployeeTasks(this.currentUserId())
      )
      .catch(async (error: any) => {
        console.error('❌ Error updating reminders:', error);
        await this.showAlert(error.message || 'Failed to update reminders.', 'error', 'Reminder Update Failed');
      });
  }

  async logOneHour(taskId: string) {
    const targetTask = this.tasks().find(task => task.id === taskId);
    if (!targetTask) {
      return;
    }

    await this.taskActionsFacadeService
      .logOneHour(targetTask, taskId, true, () => this.loadEmployeeTasks(this.currentUserId()))
      .catch(async (error: any) => {
        console.error('❌ Error logging one hour:', error);
        await this.showAlert(error.message || 'Failed to log time.', 'error', 'Time Log Failed');
      });
  }

  private async showAlert(message: string, icon: 'success' | 'error' | 'info' = 'info', title = 'Notification') {
    await this.dashboardDialogService.showAlert(message, icon, title);
  }

  isTaskLockedForReview(task: Task): boolean {
    return this.taskActionsFacadeService.isTaskLockedForReview(task);
  }

  async submitTaskForReview(task: Task) {
    await this.taskActionsFacadeService
      .submitTaskForReview(task, this.currentUserId(), () => {
        this.loadEmployeeTasks(this.currentUserId());
        this.updateDashboardStats();
      })
      .catch(async (error: any) => {
        console.error('❌ Error submitting task for approval:', error);
        await this.showAlert(error.message || 'Failed to submit task.', 'error', 'Submission Failed');
      });
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
    this.employeeChatFacade.clearChat();
    this.chatMessages.set([]);
    this.selectedConversation.set(null);
    this.selectedAdmin.set(null);
  }

  private async markConversationSeen(userId1: string, userId2: string) {
    try {
      await this.employeeChatFacade.markConversationSeen(userId1, userId2, this.currentUserId());
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
    
    const messageContent = this.chatMessage;
    if (!messageContent.trim()) {
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

      await this.employeeChatFacade.sendMessage(
        this.currentUserId(),
        this.userName(),
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
    void this.employeeProfileFacade.editProfile();
  }

  changePassword() {
    void this.employeeProfileFacade.changePassword(this.userEmail());
  }


  async updateSkills() {
    await this.employeeProfileFacade.updateSkills(this.currentUserId());
  }

  viewReports() {
    void this.employeeProfileFacade.viewReports();
  }

  async requestAccountDeletion() {
    await this.employeeProfileFacade.requestAccountDeletion();
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
    return this.dashboardUtilsService.getTabTitle(this.activeTab(), titles as Record<'dashboard' | 'projects' | 'tasks' | 'chat' | 'profile', string>, 'Dashboard');
  }

  logout() {
    console.log('👋 Logging out employee');
    this.authService.logout();
    this.router.navigate(['/signin']);
  }

  goBack() {
    this.router.navigate(['/']);
  }

} 

