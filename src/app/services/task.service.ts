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
import { Observable } from 'rxjs';
import { Task, TaskComment, EmployeeDashboardStats } from '../interfaces/models';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private firestore = inject(Firestore);
  private notificationService = inject(NotificationService);

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

    const newTask = {
      ...taskData,
      projectId,
      assignedBy: adminId,
      assignedTo: employeeId,
      comments: [],
      deadline: Timestamp.fromDate(new Date(taskData.deadline)),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(tasksRef, newTask);

    const recipientIds = await this.expandNotificationRecipients(employeeId);
    for (const recipientId of recipientIds) {
      await this.notificationService.notifyTaskAssigned(recipientId, adminId, docRef.id, taskData.title);
    }

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
    const existingTaskData = existingTaskSnapshot.exists() ? existingTaskSnapshot.data() : null;
    const previousStatus = existingTaskData?.['status'] as string | undefined;
    const assignedBy = existingTaskData?.['assignedBy'] as string | undefined;
    const assignedTo = existingTaskData?.['assignedTo'] as string | undefined;
    const taskTitle = (updates.title || existingTaskData?.['title'] || 'Task') as string;

    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    if (updates.deadline) {
      updateData.deadline = Timestamp.fromDate(new Date(updates.deadline));
    }

    await updateDoc(taskRef, updateData);

    const nextStatus = (updates.status || previousStatus) as string | undefined;
    const becameDone = previousStatus !== 'done' && nextStatus === 'done';

    if (becameDone && assignedBy && assignedTo) {
      await this.notificationService.notifyTaskCompleted(assignedBy, assignedTo, taskId, taskTitle);
    }
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
    await updateDoc(taskRef, {
      status: newStatus,
      completionPercentage,
      updatedAt: Timestamp.now(),
    });
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string): Promise<void> {
    const taskRef = doc(this.firestore, 'tasks', taskId);
    await deleteDoc(taskRef);
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
        id: Math.random().toString(36).substr(2, 9),
        taskId,
        userId,
        userName,
        userRole,
        content,
        createdAt: new Date(),
      };

      comments.push(newComment);
      await updateDoc(taskRef, { comments });
    }
  }

  /**
   * Re-assign task to another employee
   */
  async reassignTask(taskId: string, newEmployeeId: string): Promise<void> {
    const taskRef = doc(this.firestore, 'tasks', taskId);
    await updateDoc(taskRef, {
      assignedTo: newEmployeeId,
      status: 'todo',
      completionPercentage: 0,
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
