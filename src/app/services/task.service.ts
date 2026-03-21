import { Injectable, inject } from '@angular/core';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Firestore,
  Timestamp,
  query,
  where,
  getDocs,
  getDoc,
  onSnapshot,
  orderBy,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Task, TaskComment, EmployeeDashboardStats, TaskRecurrence } from '../interfaces/models';
import { NotificationService } from './notification.service';
import { TaskActivityService } from './task-activity.service';
import { ProjectService } from './project.service';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private firestore = inject(Firestore);
  private notificationService = inject(NotificationService);
  private taskActivityService = inject(TaskActivityService);
  private projectService = inject(ProjectService);

  /**
   * Create a new task (Admin only)
   */
  async createTask(
    projectId: string,
    adminId: string,
    employeeId: string,
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'assignedBy'>
  ): Promise<string> {
    const tasksRef = collection(this.firestore, 'tasks');

    const projectRef = doc(this.firestore, 'projects', projectId);
    const projectSnapshot = await getDoc(projectRef);
    if (!projectSnapshot.exists()) {
      throw new Error('Project not found.');
    }

    const projectData = projectSnapshot.data();
    const teamMembers = Array.isArray(projectData['teamMembers']) ? projectData['teamMembers'] : [];
    if (!teamMembers.includes(employeeId)) {
      throw new Error('Selected employee is not part of this project team. Add them to the project first.');
    }

    const normalizedReminderOffsets = this.normalizeReminderOffsets(
      taskData.reminderOffsetsMinutes
    );
    const normalizedDeadline = this.normalizeDeadline(taskData.deadline);

    const newTask = {
      ...taskData,
      projectId,
      assignedBy: adminId,
      assignedTo: employeeId,
      comments: [],
      reminderOffsetsMinutes: normalizedReminderOffsets,
      effortPoints: this.normalizeEffortPoints(taskData.effortPoints),
      estimatedHours: this.normalizeHours(taskData.estimatedHours),
      actualHours: this.normalizeHours(taskData.actualHours),
      deadline: Timestamp.fromDate(normalizedDeadline),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(tasksRef, newTask);

    const recipientIds = await this.expandNotificationRecipients(employeeId);
    for (const recipientId of recipientIds) {
      await this.notificationService.notifyTaskAssigned(recipientId, adminId, docRef.id, taskData.title);
    }

    await this.taskActivityService.logEvent({
      taskId: docRef.id,
      projectId,
      actorId: adminId,
      actorName: 'Admin',
      actorRole: 'admin',
      action: 'created',
      metadata: {
        assignedTo: employeeId,
        title: taskData.title,
      },
    });

    await this.syncProjectProgress(projectId);

    return docRef.id;
  }

  /**
   * Get all tasks in a project
   */
  getProjectTasks(projectId: string): Observable<Task[]> {
    const tasksRef = collection(this.firestore, 'tasks');
    const q = query(tasksRef, where('projectId', '==', projectId), orderBy('deadline', 'asc'));

    return new Observable<Task[]>((subscriber) => {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const tasks = snapshot.docs.map((snapshotDoc) => {
            const t = snapshotDoc.data() as any;
            return {
              id: snapshotDoc.id,
              ...t,
              deadline: t.deadline?.toDate ? t.deadline.toDate() : t.deadline,
              createdAt: t.createdAt?.toDate ? t.createdAt.toDate() : t.createdAt,
              updatedAt: t.updatedAt?.toDate ? t.updatedAt.toDate() : t.updatedAt,
            } as Task;
          });
          subscriber.next(tasks);
        },
        (error) => subscriber.error(error)
      );

      return () => unsubscribe();
    });
  }

  /**
   * Get all tasks assigned to an employee
   */
  getEmployeeTasks(employeeId: string): Observable<Task[]> {
  const tasksRef = collection(this.firestore, 'tasks');
  const q = query(tasksRef, where('assignedTo', '==', employeeId), orderBy('deadline', 'asc'));

  return new Observable<Task[]>((subscriber) => {
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tasks = snapshot.docs.map((snapshotDoc) => {
          const t = snapshotDoc.data() as any;
          const deadline = t.deadline;
          const createdAt = t.createdAt;
          const updatedAt = t.updatedAt;

          return {
            id: snapshotDoc.id,
            ...t,
            deadline: deadline?.toDate ? deadline.toDate() : (deadline instanceof Date ? deadline : new Date(deadline)),
            createdAt: createdAt?.toDate ? createdAt.toDate() : (createdAt instanceof Date ? createdAt : new Date(createdAt)),
            updatedAt: updatedAt?.toDate ? updatedAt.toDate() : (updatedAt instanceof Date ? updatedAt : new Date(updatedAt)),
          } as Task;
        });

        subscriber.next(tasks);
      },
      (error) => subscriber.error(error)
    );

    return () => unsubscribe();
  });
  }

  /**
   * Get single task by ID
   */
  getTask(taskId: string): Observable<Task | null> {
    return new Observable<Task | null>((subscriber) => {
      const taskRef = doc(this.firestore, 'tasks', taskId);

      const unsubscribe = onSnapshot(
        taskRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            subscriber.next(null);
            return;
          }

          const taskData = snapshot.data() as any;
          subscriber.next({
            id: snapshot.id,
            ...taskData,
            deadline: taskData.deadline?.toDate ? taskData.deadline.toDate() : taskData.deadline,
            createdAt: taskData.createdAt?.toDate ? taskData.createdAt.toDate() : taskData.createdAt,
            updatedAt: taskData.updatedAt?.toDate ? taskData.updatedAt.toDate() : taskData.updatedAt,
          } as Task);
        },
        (error) => subscriber.error(error)
      );

      return () => unsubscribe();
    });
  }

  /**
   * Update task
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const taskRef = doc(this.firestore, 'tasks', taskId);
    const existingTaskSnapshot = await getDoc(taskRef);
    if (!existingTaskSnapshot.exists()) {
      throw new Error('Task not found');
    }

    const existingTaskData = existingTaskSnapshot.exists() ? existingTaskSnapshot.data() : null;
    const previousStatus = existingTaskData?.['status'] as string | undefined;
    const assignedBy = existingTaskData?.['assignedBy'] as string | undefined;
    const assignedTo = existingTaskData?.['assignedTo'] as string | undefined;
    const projectId = (existingTaskData?.['projectId'] || '') as string;
    const taskTitle = (updates.title || existingTaskData?.['title'] || 'Task') as string;
    const nextStatus = (updates.status || previousStatus) as string | undefined;

    if (typeof updates.completionPercentage === 'number') {
      updates.completionPercentage = this.normalizeCompletionPercentage(updates.completionPercentage);
    }

    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    if (updates.deadline) {
      updateData.deadline = Timestamp.fromDate(this.normalizeDeadline(updates.deadline));
    }

    if (updates.reminderOffsetsMinutes) {
      updateData.reminderOffsetsMinutes = this.normalizeReminderOffsets(updates.reminderOffsetsMinutes);
    }

    if (typeof updates.effortPoints === 'number') {
      updateData.effortPoints = this.normalizeEffortPoints(updates.effortPoints);
    }

    if (typeof updates.estimatedHours === 'number') {
      updateData.estimatedHours = this.normalizeHours(updates.estimatedHours);
    }

    if (typeof updates.actualHours === 'number') {
      updateData.actualHours = this.normalizeHours(updates.actualHours);
    }

    await updateDoc(taskRef, updateData);

    const becameDone = previousStatus !== 'done' && nextStatus === 'done';

    if (becameDone && assignedBy && assignedTo) {
      await this.notificationService.notifyTaskCompleted(assignedBy, assignedTo, taskId, taskTitle);
      await this.generateNextRecurringTask(taskId);
    }

    await this.taskActivityService.logEvent({
      taskId,
      projectId,
      actorId: assignedBy || 'system',
      actorName: 'System',
      actorRole: assignedBy ? 'admin' : 'system',
      action: nextStatus && nextStatus !== previousStatus ? 'status-changed' : 'updated',
      metadata: {
        previousStatus,
        nextStatus,
        updatedFields: Object.keys(updates || {}),
      },
    });

    await this.syncProjectProgress(projectId);
  }

  /**
   * Update task status (Employee can update their task status)
   */
  async updateTaskStatus(
    taskId: string,
    newStatus: 'todo' | 'in-progress' | 'done',
    completionPercentage: number
  ): Promise<void> {
    const taskRef = doc(this.firestore, 'tasks', taskId);
    const taskSnapshot = await getDoc(taskRef);

    if (!taskSnapshot.exists()) {
      throw new Error('Task not found');
    }

    const taskData = taskSnapshot.data();
    const previousStatus = taskData['status'] as string;

    const normalizedCompletion = this.normalizeCompletionPercentage(completionPercentage);

    await updateDoc(taskRef, {
      status: newStatus,
      completionPercentage: normalizedCompletion,
      updatedAt: Timestamp.now(),
    });

    if (previousStatus !== 'done' && newStatus === 'done') {
      await this.generateNextRecurringTask(taskId);
    }

    await this.taskActivityService.logEvent({
      taskId,
      projectId: (taskData['projectId'] || '') as string,
      actorId: (taskData['assignedTo'] || 'system') as string,
      actorName: 'User',
      actorRole: 'employee',
      action: 'status-changed',
      metadata: {
        from: previousStatus,
        to: newStatus,
        completionPercentage: normalizedCompletion,
      },
    });

    await this.syncProjectProgress((taskData['projectId'] || '') as string);
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string): Promise<void> {
    const taskRef = doc(this.firestore, 'tasks', taskId);
    const taskSnapshot = await getDoc(taskRef);
    const taskData = taskSnapshot.exists() ? taskSnapshot.data() : null;

    await deleteDoc(taskRef);

    if (taskData) {
      await this.taskActivityService.logEvent({
        taskId,
        projectId: (taskData['projectId'] || '') as string,
        actorId: (taskData['assignedBy'] || 'system') as string,
        actorName: 'Admin',
        actorRole: 'admin',
        action: 'deleted',
        metadata: { title: taskData['title'] || 'Task' },
      });

      await this.syncProjectProgress((taskData['projectId'] || '') as string);
    }
  }

  /**
   * Add comment to task
   */
  async addCommentToTask(
    taskId: string,
    userId: string,
    userName: string,
    userRole: 'admin' | 'employee',
    content: string
  ): Promise<void> {
    const taskRef = doc(this.firestore, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);

    if (taskSnap.exists()) {
      const comments = taskSnap.data()['comments'] || [];
      const newComment: TaskComment = {
        id: this.generateEntityId(),
        taskId,
        userId,
        userName,
        userRole,
        content,
        createdAt: new Date(),
      };

      comments.push(newComment);
      await updateDoc(taskRef, { comments });

      await this.taskActivityService.logEvent({
        taskId,
        projectId: (taskSnap.data()['projectId'] || '') as string,
        actorId: userId,
        actorName: userName,
        actorRole: userRole,
        action: 'comment-added',
        metadata: { commentLength: content.length },
      });
    }
  }

  /**
   * Re-assign task to another employee
   */
  async reassignTask(taskId: string, newEmployeeId: string): Promise<void> {
    const taskRef = doc(this.firestore, 'tasks', taskId);
    const taskSnapshot = await getDoc(taskRef);
    if (!taskSnapshot.exists()) {
      throw new Error('Task not found');
    }

    const currentData = taskSnapshot.data();

    await updateDoc(taskRef, {
      assignedTo: newEmployeeId,
      status: 'todo',
      completionPercentage: 0,
      updatedAt: Timestamp.now(),
    });

    const recipientIds = await this.expandNotificationRecipients(newEmployeeId);
    for (const recipientId of recipientIds) {
      await this.notificationService.notifyTaskAssigned(
        recipientId,
        (currentData['assignedBy'] || '') as string,
        taskId,
        (currentData['title'] || 'Task') as string
      );
    }

    await this.taskActivityService.logEvent({
      taskId,
      projectId: (currentData['projectId'] || '') as string,
      actorId: (currentData['assignedBy'] || 'system') as string,
      actorName: 'Admin',
      actorRole: 'admin',
      action: 'reassigned',
      metadata: {
        from: currentData['assignedTo'] || null,
        to: newEmployeeId,
      },
    });
  }

  async bulkUpdateTasks(
    taskIds: string[],
    updates: Partial<Pick<Task, 'status' | 'priority' | 'assignedTo' | 'deadline' | 'completionPercentage'>>,
    actorId: string,
    actorName: string,
    actorRole: 'admin' | 'employee' = 'admin'
  ): Promise<void> {
    if (!taskIds || taskIds.length === 0) {
      return;
    }

    const normalizedUpdateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    if (updates.deadline) {
      normalizedUpdateData.deadline = Timestamp.fromDate(new Date(updates.deadline));
    }

    if (typeof updates.completionPercentage === 'number') {
      normalizedUpdateData.completionPercentage = this.normalizeCompletionPercentage(
        updates.completionPercentage
      );
    }

    const touchedProjectIds = new Set<string>();

    for (const taskId of taskIds) {
      const taskRef = doc(this.firestore, 'tasks', taskId);
      const taskSnapshot = await getDoc(taskRef);
      if (!taskSnapshot.exists()) {
        continue;
      }

      const existing = taskSnapshot.data();
      const projectId = (existing['projectId'] || '') as string;
      const previousStatus = existing['status'] as string;
      await updateDoc(taskRef, normalizedUpdateData);

      if (previousStatus !== 'done' && updates.status === 'done') {
        await this.generateNextRecurringTask(taskId);
      }

      await this.taskActivityService.logEvent({
        taskId,
        projectId,
        actorId,
        actorName,
        actorRole,
        action: 'bulk-updated',
        metadata: {
          updates,
          previousStatus,
          nextStatus: updates.status || previousStatus,
        },
      });

      if (projectId) {
        touchedProjectIds.add(projectId);
      }
    }

    for (const projectId of touchedProjectIds) {
      await this.syncProjectProgress(projectId);
    }
  }

  async setTaskReminders(
    taskId: string,
    reminderOffsetsMinutes: number[],
    actorId: string,
    actorName: string,
    actorRole: 'admin' | 'employee' = 'admin'
  ): Promise<void> {
    const taskRef = doc(this.firestore, 'tasks', taskId);
    const taskSnapshot = await getDoc(taskRef);
    if (!taskSnapshot.exists()) {
      throw new Error('Task not found');
    }

    const normalized = this.normalizeReminderOffsets(reminderOffsetsMinutes);
    await updateDoc(taskRef, {
      reminderOffsetsMinutes: normalized,
      updatedAt: Timestamp.now(),
    });

    const taskData = taskSnapshot.data();
    await this.taskActivityService.logEvent({
      taskId,
      projectId: (taskData['projectId'] || '') as string,
      actorId,
      actorName,
      actorRole,
      action: 'reminder-updated',
      metadata: { reminderOffsetsMinutes: normalized },
    });
  }

  processTaskRemindersForWindow(minutesWindow = 60): Promise<void> {
    return this.processUpcomingTaskReminders(minutesWindow);
  }

  getTaskPriorityScore(task: Task): number {
    const priorityWeights: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      urgent: 4,
    };

    const priorityScore = priorityWeights[task.priority] || 1;
    const effortPoints = this.normalizeEffortPoints(task.effortPoints);
    const normalizedEffort = effortPoints > 0 ? effortPoints : 1;

    const deadline = task.deadline instanceof Date ? task.deadline : new Date(task.deadline);
    const daysUntilDeadline = Math.max(
      0.1,
      (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return (priorityScore * 10) / (normalizedEffort * daysUntilDeadline);
  }

  getPrioritizedEmployeeTasks(employeeId: string): Observable<Task[]> {
    return this.getEmployeeTasks(employeeId).pipe(
      map((tasks) =>
        [...tasks].sort(
          (left, right) => this.getTaskPriorityScore(right) - this.getTaskPriorityScore(left)
        )
      )
    );
  }

  getTaskActivity(taskId: string) {
    return this.taskActivityService.getTaskActivity(taskId);
  }

  getTasksBySavedFilter(employeeId: string, filterKey: 'my-overdue' | 'due-this-week' | 'unassigned'): Observable<Task[]> {
    return this.getEmployeeTasks(employeeId).pipe(
      map((tasks) => {
        const now = new Date();
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);

        switch (filterKey) {
          case 'my-overdue':
            return tasks.filter(task => task.status !== 'done' && new Date(task.deadline) < now);
          case 'due-this-week':
            return tasks.filter(task => {
              const deadline = new Date(task.deadline);
              return deadline >= now && deadline <= weekEnd;
            });
          case 'unassigned':
            return tasks.filter(task => !task.assignedTo || task.assignedTo.trim().length === 0);
          default:
            return tasks;
        }
      })
    );
  }

  async addTaskAttachment(taskId: string, attachmentUrl: string): Promise<void> {
    const taskRef = doc(this.firestore, 'tasks', taskId);
    const taskSnapshot = await getDoc(taskRef);
    if (!taskSnapshot.exists()) {
      throw new Error('Task not found');
    }

    const attachments = (taskSnapshot.data()['attachments'] || []) as string[];
    if (!attachments.includes(attachmentUrl)) {
      attachments.push(attachmentUrl);
    }

    await updateDoc(taskRef, {
      attachments,
      updatedAt: Timestamp.now(),
    });
  }

  async removeTaskAttachment(taskId: string, attachmentUrl: string): Promise<void> {
    const taskRef = doc(this.firestore, 'tasks', taskId);
    const taskSnapshot = await getDoc(taskRef);
    if (!taskSnapshot.exists()) {
      throw new Error('Task not found');
    }

    const attachments = ((taskSnapshot.data()['attachments'] || []) as string[]).filter(
      item => item !== attachmentUrl
    );

    await updateDoc(taskRef, {
      attachments,
      updatedAt: Timestamp.now(),
    });
  }

  async addActualHours(taskId: string, hoursToAdd: number): Promise<void> {
    if (hoursToAdd <= 0) {
      return;
    }

    const taskRef = doc(this.firestore, 'tasks', taskId);
    const taskSnapshot = await getDoc(taskRef);
    if (!taskSnapshot.exists()) {
      throw new Error('Task not found');
    }

    const currentHours = Number(taskSnapshot.data()['actualHours'] || 0);
    const nextHours = this.normalizeHours(currentHours + hoursToAdd);

    await updateDoc(taskRef, {
      actualHours: nextHours,
      updatedAt: Timestamp.now(),
    });
  }

  /**
   * Get employee dashboard statistics
   */
  async getEmployeeDashboardStats(employeeId: string): Promise<EmployeeDashboardStats> {
    const tasksRef = collection(this.firestore, 'tasks');
    const tasksQuery = query(tasksRef, where('assignedTo', '==', employeeId));
    const tasksSnap = await getDocs(tasksQuery);

    const allTasks = tasksSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      deadline: doc.data()['deadline']?.toDate ? doc.data()['deadline'].toDate() : doc.data()['deadline'],
    }));

    const assignedTasks = allTasks.length;
    const completedTasks = allTasks.filter((t: any) => t.status === 'done').length;
    const inProgressTasks = allTasks.filter((t: any) => t.status === 'in-progress').length;

    const now = new Date();
    const overdueTaskCount = allTasks.filter(
      (t: any) => t.status !== 'done' && new Date(t.deadline) < now
    ).length;

    const taskCompletionRate = assignedTasks > 0 ? (completedTasks / assignedTasks) * 100 : 0;

    return {
      assignedTasks,
      completedTasks,
      inProgressTasks,
      overdueTaskCount,
      taskCompletionRate,
    };
  }

  async checkAndNotifyOverdueTasksForAdmin(adminId: string): Promise<void> {
    const tasksRef = collection(this.firestore, 'tasks');
    const tasksQuery = query(tasksRef, where('assignedBy', '==', adminId));
    const tasksSnapshot = await getDocs(tasksQuery);

    const now = new Date();

    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();
      const status = task['status'];
      const deadlineDate = task['deadline']?.toDate ? task['deadline'].toDate() : new Date(task['deadline']);

      if (status !== 'done' && deadlineDate < now) {
        const deadlineISODate = deadlineDate.toISOString().slice(0, 10);
        await this.notificationService.notifyTaskOverdue(
          adminId,
          task['assignedTo'] || '',
          taskDoc.id,
          task['title'] || 'Task',
          deadlineISODate
        );
      }
    }
  }

  private async generateNextRecurringTask(taskId: string): Promise<void> {
    const taskRef = doc(this.firestore, 'tasks', taskId);
    const taskSnapshot = await getDoc(taskRef);

    if (!taskSnapshot.exists()) {
      return;
    }

    const taskData = taskSnapshot.data() as any;
    const recurrence = taskData['recurrence'] as TaskRecurrence | undefined;

    if (!recurrence?.enabled) {
      return;
    }

    const currentDeadline = taskData['deadline']?.toDate
      ? taskData['deadline'].toDate()
      : new Date(taskData['deadline']);

    const nextDeadline = this.computeNextDeadline(currentDeadline, recurrence);
    const recurrenceEndDate = recurrence.endDate
      ? new Date(recurrence.endDate)
      : null;

    if (recurrenceEndDate && nextDeadline > recurrenceEndDate) {
      return;
    }

    const tasksRef = collection(this.firestore, 'tasks');
    const nextTaskDoc = await addDoc(tasksRef, {
      ...taskData,
      status: 'todo',
      completionPercentage: 0,
      sourceTaskId: taskData['sourceTaskId'] || taskId,
      deadline: Timestamp.fromDate(nextDeadline),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await this.taskActivityService.logEvent({
      taskId: nextTaskDoc.id,
      projectId: (taskData['projectId'] || '') as string,
      actorId: 'system',
      actorName: 'System',
      actorRole: 'system',
      action: 'recurring-generated',
      metadata: {
        sourceTaskId: taskId,
        nextDeadline: nextDeadline.toISOString(),
      },
    });

    await this.syncProjectProgress((taskData['projectId'] || '') as string);
  }

  private computeNextDeadline(currentDate: Date, recurrence: TaskRecurrence): Date {
    const interval = recurrence.interval && recurrence.interval > 0 ? recurrence.interval : 1;
    const nextDate = new Date(currentDate);

    switch (recurrence.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + interval * 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + 1);
        break;
    }

    return nextDate;
  }

  private async processUpcomingTaskReminders(minutesWindow: number): Promise<void> {
    const tasksRef = collection(this.firestore, 'tasks');
    const openTasksQuery = query(tasksRef, where('status', '!=', 'done'));
    const tasksSnapshot = await getDocs(openTasksQuery);
    const now = Date.now();
    const windowMs = Math.max(1, minutesWindow) * 60 * 1000;

    for (const taskDoc of tasksSnapshot.docs) {
      const data = taskDoc.data();
      const reminderOffsets = this.normalizeReminderOffsets(data['reminderOffsetsMinutes']);
      if (!reminderOffsets.length) {
        continue;
      }

      const deadlineDate = data['deadline']?.toDate ? data['deadline'].toDate() : new Date(data['deadline']);
      const deadlineMs = deadlineDate.getTime();

      for (const offset of reminderOffsets) {
        const triggerAtMs = deadlineMs - offset * 60 * 1000;
        const isInWindow = triggerAtMs >= now && triggerAtMs <= now + windowMs;
        if (!isInWindow) {
          continue;
        }

        await this.notificationService.notifyTaskReminder(
          (data['assignedTo'] || '') as string,
          taskDoc.id,
          (data['title'] || 'Task') as string,
          offset
        );
      }
    }
  }

  private normalizeCompletionPercentage(value: number): number {
    if (Number.isNaN(value)) {
      return 0;
    }
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  private normalizeEffortPoints(value?: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 0;
    }
    return Math.max(0, Math.round(value));
  }

  private normalizeHours(value?: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 0;
    }
    return Math.max(0, Math.round(value * 100) / 100);
  }

  private normalizeDeadline(value: any): Date {
    if (value instanceof Date) {
      const date = new Date(value);
      date.setHours(23, 59, 59, 999);
      return date;
    }

    if (typeof value === 'string') {
      const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
      if (dateOnlyMatch) {
        const year = Number(dateOnlyMatch[1]);
        const month = Number(dateOnlyMatch[2]) - 1;
        const day = Number(dateOnlyMatch[3]);
        return new Date(year, month, day, 23, 59, 59, 999);
      }

      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        parsed.setHours(23, 59, 59, 999);
        return parsed;
      }
    }

    const fallback = new Date();
    fallback.setHours(23, 59, 59, 999);
    return fallback;
  }

  private async syncProjectProgress(projectId: string): Promise<void> {
    if (!projectId) {
      return;
    }

    try {
      await this.projectService.updateProjectProgress(projectId);
    } catch (error) {
      console.error('❌ Failed to sync project progress:', { projectId, error });
    }
  }

  private normalizeReminderOffsets(value: any): number[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const normalized = value
      .map((offset) => Number(offset))
      .filter((offset) => !Number.isNaN(offset) && offset > 0)
      .map((offset) => Math.round(offset));

    return Array.from(new Set(normalized)).sort((left, right) => left - right);
  }

  private generateEntityId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private async expandNotificationRecipients(userId: string): Promise<string[]> {
    const recipients = new Set<string>();
    if (!userId) return [];

    recipients.add(userId);

    try {
      const userDocRef = doc(this.firestore, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        if (typeof data['uid'] === 'string' && data['uid'].trim().length > 0) {
          recipients.add(data['uid']);
        }
      }

      const reverseQuery = query(collection(this.firestore, 'users'), where('uid', '==', userId));
      const reverseSnapshot = await getDocs(reverseQuery);
      reverseSnapshot.docs.forEach(snapshot => {
        recipients.add(snapshot.id);
        const data = snapshot.data();
        if (typeof data['uid'] === 'string' && data['uid'].trim().length > 0) {
          recipients.add(data['uid']);
        }
      });
    } catch (error) {
      console.warn('Could not expand notification recipients for user:', userId, error);
    }

    return Array.from(recipients);
  }
}
