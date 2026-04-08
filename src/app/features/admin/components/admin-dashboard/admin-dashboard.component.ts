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
import { AuthService } from '../../../../services/auth-service/auth-service';
import { ProjectService } from '../../../../services/api/project-api.service';
import { TaskService } from '../../../../services/api/task-api.service';
import { NotificationService, Notification } from '../../../../services/api/notification-api.service';
import { AppSidebarComponent, AppNavItem } from '../../../../layout/sidebar/sidebar.component';
import { AppTopbarComponent } from '../../../../layout/header/header.component';
import { AppNotificationsPanelComponent } from '../../../../features/shared-features/notifications/components/notification-list/notifications-panel.component';
import {
  AdminDashboardTabComponent,
  AdminProjectsTabComponent,
  AdminTasksTabComponent,
  AdminVerificationTabComponent,
  AdminChatTabComponent,
  AdminSettingsTabComponent,
} from '../admin-tabs';
import { AdminDashboardDataService } from '../../../../services/dashboard/admin-dashboard-data.service';
import { DashboardDialogService } from '../../../../services/dashboard/dashboard-dialog.service';
import { DashboardNotificationService } from '../../../../services/dashboard/dashboard-notification.service';
import { DashboardUtilsService } from '../../../../services/dashboard/dashboard-utils.service';
import { AdminVerificationFacade } from '../../services/admin-verification.facade';
import { AdminProjectTaskFacade } from '../../services/admin-project-task.facade';
import { AdminChatFacade } from '../../services/admin-chat.facade';

/* ===== Models ===== */
import {
  Project,
  Task,
  User,
  AdminDashboardStats,
  TaskActivityEntry
} from '../../../../models/models';

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
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AppSidebarComponent,
    AppTopbarComponent,
    AppNotificationsPanelComponent,
    AdminDashboardTabComponent,
    AdminProjectsTabComponent,
    AdminTasksTabComponent,
    AdminVerificationTabComponent,
    AdminChatTabComponent,
    AdminSettingsTabComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styles: ``,
})
export class AdminDashboardPageComponent implements OnInit {
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private notificationService = inject(NotificationService);
  private adminDashboardDataService = inject(AdminDashboardDataService);
  private dashboardDialogService = inject(DashboardDialogService);
  private dashboardNotificationService = inject(DashboardNotificationService);
  private dashboardUtilsService = inject(DashboardUtilsService);
  private adminVerificationFacade = inject(AdminVerificationFacade);
  private adminProjectTaskFacade = inject(AdminProjectTaskFacade);
  private adminChatFacade = inject(AdminChatFacade);
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
  verificationProjectFilter = signal('all');
  verificationPriorityFilter = signal<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
  verificationSortBy = signal<'newest' | 'oldest' | 'priority'>('newest');
  bulkStatus = '';
  bulkPriority = '';
  bulkAssignee = '';

  dashboardStats = signal<AdminDashboardStats | null>(null);

  activeTab = signal<'dashboard' | 'projects' | 'tasks' | 'verification' | 'chat' | 'settings'>('dashboard');
  readonly sidebarItems: AppNavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'projects', label: 'Projects', icon: 'folder' },
    { key: 'tasks', label: 'Tasks', icon: 'task_alt' },
    { key: 'verification', label: 'Verification Queue', icon: 'fact_check' },
    { key: 'chat', label: 'Chat', icon: 'chat' },
    { key: 'settings', label: 'Settings', icon: 'settings' }
  ];
  showNotifications = signal(false);
  showCreateProjectForm = signal(false);
  showCreateTaskForm = signal(false);
  selectedConversation = signal<DashboardConversation | null>(null);
  chatMessage = '';

  unreadNotifications = computed(() => this.notifications().filter(notification => !notification.read).length);

  verificationQueueTasks = computed(() => {
    let queue = this.tasks().filter((task) => task.status === 'pending-approval');

    if (this.verificationProjectFilter() !== 'all') {
      queue = queue.filter((task) => task.projectId === this.verificationProjectFilter());
    }

    if (this.verificationPriorityFilter() !== 'all') {
      queue = queue.filter((task) => task.priority === this.verificationPriorityFilter());
    }

    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

    switch (this.verificationSortBy()) {
      case 'oldest':
        queue.sort((a, b) => this.dashboardUtilsService.getVerificationSubmittedAt(a).getTime() - this.dashboardUtilsService.getVerificationSubmittedAt(b).getTime());
        break;
      case 'priority':
        queue.sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));
        break;
      default:
        queue.sort((a, b) => this.dashboardUtilsService.getVerificationSubmittedAt(b).getTime() - this.dashboardUtilsService.getVerificationSubmittedAt(a).getTime());
        break;
    }

    return queue;
  });

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

    this.adminDashboardDataService
      .getAdminTasks()
      .then((tasks) => {
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

    this.adminDashboardDataService
      .getEmployees()
      .then((employees) => {
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

loadConversationsUltimate(adminId: string) {
  console.log('Loading conversations using getDocs() for admin:', adminId);
  
  if (!adminId) {
    console.error('❌ No admin ID provided');
    this.conversations.set([]);
    return;
  }

  try {
    this.adminChatFacade
      .loadConversations(adminId)
      .then((conversations) => {
        console.log('Conversations loaded with getDocs():', conversations.length);
        this.conversations.set(conversations as DashboardConversation[]);

        if (conversations.length > 0 && !this.selectedConversation()) {
          this.selectConversationUltimate(conversations[0] as DashboardConversation);
        }
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
    this.adminChatFacade.loadMessages(userId1, userId2, {
      onMessages: (messages) => this.chatMessages.set(messages as DashboardMessage[]),
      onAfterLoad: () => {
        void this.markConversationSeen(userId1, userId2);
      },
      onError: () => this.chatMessages.set([])
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

  onTabChange(tab: 'dashboard' | 'projects' | 'tasks' | 'verification' | 'chat' | 'settings', event?: Event) {
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
      case 'verification':
        this.loadTasks();
        break;
      case 'chat':
        // Use the ULTIMATE fix method to load conversations
        this.loadConversationsUltimate(this.currentUserId());
        break;
    }
  }

  onSidebarTabChange(tab: string) {
    this.onTabChange(tab as 'dashboard' | 'projects' | 'tasks' | 'verification' | 'chat' | 'settings');
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

  getNotificationDate(value: any): Date {
    return this.dashboardNotificationService.getNotificationDate(value);
  }

  createProject() {
    if (this.projectForm.valid) {
      const adminId = this.currentUserId();
      this.adminProjectTaskFacade.createProject(adminId, this.projectForm.value, this.projectTeamSelection())
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

    try {
      await this.adminProjectTaskFacade.createTestProject(adminId);
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
      this.adminProjectTaskFacade.createTask(adminId, this.taskForm.value).then(() => {
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
    const confirmed = await this.adminProjectTaskFacade.deleteProject(project);
    if (confirmed) {
      console.log('Deleting project:', project.id);
      this.loadAdminProjects();
      this.loadTasks();
      this.loadDashboardStats(this.currentUserId());
    }
  }

  async changeProjectStatus(project: Project, event: Event) {
    const selectElement = event.target as HTMLSelectElement | null;
    const nextStatus = (selectElement?.value || project.status) as Project['status'];

    if (nextStatus === project.status) {
      return;
    }

    try {
      await this.adminProjectTaskFacade.changeProjectStatus(project, nextStatus);
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
    try {
      const confirmed = await this.adminProjectTaskFacade.deleteTask(taskId);
      if (!confirmed) {
        return;
      }

      this.loadAdminProjects();
      this.loadTasks();
    } catch (error: any) {
      console.error('❌ Error deleting task:', error);
      await this.showAlert('Error deleting task: ' + error.message, 'error', 'Delete Failed');
    }
  }

  async editProject(project: Project) {
    try {
      const updated = await this.adminProjectTaskFacade.updateProjectTeam(project, this.employees());
      if (!updated) {
        return;
      }

      await this.showAlert('Project team updated successfully.', 'success', 'Team Updated');
      this.loadAdminProjects();
      this.onTaskProjectChanged(this.taskForm.get('projectId')?.value || '');
    } catch (error: any) {
      console.error('❌ Error updating project team:', error);
      await this.showAlert('Error updating project team: ' + error.message, 'error', 'Update Failed');
    }
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
      await this.adminProjectTaskFacade.applyBulkUpdate(selectedIds, updates, this.currentUserId(), this.userName());

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
    try {
      const updated = await this.adminProjectTaskFacade.setTaskReminders(task, this.currentUserId(), this.userName());
      if (!updated) {
        return;
      }
      this.loadTasks();
    } catch (error: any) {
      console.error('❌ Error updating reminders:', error);
      await this.showAlert('Failed to update reminders: ' + error.message, 'error', 'Reminder Update Failed');
    }
  }

  async logOneHour(taskId: string) {
    try {
      await this.adminProjectTaskFacade.logOneHour(taskId);
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

  async reviewVerificationTask(task: Task) {
    await this.adminVerificationFacade.reviewVerificationTask(task, {
      currentUserId: this.currentUserId(),
      projectName: this.getProjectName(task.projectId),
      employeeName: this.getEmployeeName(task.assignedTo),
      onReload: () => {
        this.loadTasks();
        this.loadDashboardStats(this.currentUserId());
      }
    });
  }

  getTaskScore(task: Task): number {
    return this.taskService.getTaskPriorityScore(task);
  }

  private async showAlert(message: string, icon: 'success' | 'error' | 'info' = 'info', title = 'Notification') {
    await this.dashboardDialogService.showAlert(message, icon, title);
  }

  // Keep backward compatibility
  selectConversation(conv: DashboardConversation, event?: Event) {
    this.selectConversationUltimate(conv, event);
  }

  private async markConversationSeen(userId1: string, userId2: string) {
    try {
      await this.adminChatFacade.markConversationSeen(userId1, userId2, this.currentUserId());
      this.loadConversationsUltimate(this.currentUserId());
    } catch (error) {
      console.error('❌ Error marking conversation as seen:', error);
    }
  }

  loadConversations(adminId: string) {
    this.loadConversationsUltimate(adminId);
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

      await this.adminChatFacade.sendMessage(
        this.currentUserId(),
        this.userName(),
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

  getProjectName(projectId: string): string {
    const project = this.projects().find((item) => item.id === projectId);
    return project?.name || 'Unknown Project';
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
      verification: 'Verification Queue',
      chat: 'Chat',
      settings: 'Settings',
    };
    return this.dashboardUtilsService.getTabTitle(this.activeTab(), titles as Record<'dashboard' | 'projects' | 'tasks' | 'verification' | 'chat' | 'settings', string>, 'Dashboard');
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

