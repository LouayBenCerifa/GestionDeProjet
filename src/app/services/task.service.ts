import { Injectable, inject } from '@angular/core';
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
  orderBy,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Task, TaskComment, EmployeeDashboardStats } from '../interfaces/models';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private firestore = inject(Firestore);

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

    // Create notification for employee
    await this.createTaskNotification(employeeId, taskData.title, docRef.id);

    return docRef.id;
  }

  /**
   * Get all tasks in a project
   */
  getProjectTasks(projectId: string): Observable<Task[]> {
    const tasksRef = collection(this.firestore, 'tasks');
    const q = query(tasksRef, where('projectId', '==', projectId), orderBy('deadline', 'asc'));

    return collectionData(q, { idField: 'id' }).pipe(
      map((tasks: any[]) =>
        tasks.map((t) => ({
          ...t,
          deadline: t.deadline?.toDate ? t.deadline.toDate() : t.deadline,
          createdAt: t.createdAt?.toDate ? t.createdAt.toDate() : t.createdAt,
          updatedAt: t.updatedAt?.toDate ? t.updatedAt.toDate() : t.updatedAt,
        }))
      )
    ) as Observable<Task[]>;
  }

  /**
   * Get all tasks assigned to an employee
   */
  getEmployeeTasks(employeeId: string): Observable<Task[]> {
  const tasksRef = collection(this.firestore, 'tasks');
  const q = query(tasksRef, where('assignedTo', '==', employeeId), orderBy('deadline', 'asc'));

  return collectionData(q, { idField: 'id' }).pipe(
    map((tasks: any[]) =>
      tasks.map((t) => {
        // Safely handle Firestore Timestamps
        const deadline = t.deadline;
        const createdAt = t.createdAt;
        const updatedAt = t.updatedAt;
        
        return {
          ...t,
          deadline: deadline?.toDate ? deadline.toDate() : 
                   (deadline instanceof Date ? deadline : new Date(deadline)),
          createdAt: createdAt?.toDate ? createdAt.toDate() : 
                    (createdAt instanceof Date ? createdAt : new Date(createdAt)),
          updatedAt: updatedAt?.toDate ? updatedAt.toDate() : 
                    (updatedAt instanceof Date ? updatedAt : new Date(updatedAt)),
        } as Task;
      })
    )
  );
  }

  /**
   * Get single task by ID
   */
  getTask(taskId: string): Observable<Task | null> {
    const taskRef = doc(this.firestore, 'tasks', taskId);

    return collectionData(query(collection(this.firestore, 'tasks'), where('__name__', '==', taskId)), {
      idField: 'id',
    }).pipe(
      map((tasks: any[]) =>
        tasks.length > 0
          ? {
              ...tasks[0],
              deadline: tasks[0].deadline?.toDate
                ? tasks[0].deadline.toDate()
                : tasks[0].deadline,
              createdAt: tasks[0].createdAt?.toDate
                ? tasks[0].createdAt.toDate()
                : tasks[0].createdAt,
              updatedAt: tasks[0].updatedAt?.toDate
                ? tasks[0].updatedAt.toDate()
                : tasks[0].updatedAt,
            }
          : null
      )
    ) as Observable<Task | null>;
  }

  /**
   * Update task
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const taskRef = doc(this.firestore, 'tasks', taskId);

    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    if (updates.deadline) {
      updateData.deadline = Timestamp.fromDate(new Date(updates.deadline));
    }

    await updateDoc(taskRef, updateData);
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

  /**
   * Private helper: Create task notification
   */
  private async createTaskNotification(
    employeeId: string,
    taskTitle: string,
    taskId: string
  ): Promise<void> {
    const notificationsRef = collection(this.firestore, 'notifications');
    await addDoc(notificationsRef, {
      userId: employeeId,
      type: 'task-assigned',
      title: 'New Task Assigned',
      message: `You have been assigned: ${taskTitle}`,
      link: `/employee/tasks/${taskId}`,
      isRead: false,
      createdAt: Timestamp.now(),
    });
  }
}
