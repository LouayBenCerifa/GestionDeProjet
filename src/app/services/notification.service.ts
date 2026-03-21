// services/notification.service.ts
import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from '@angular/fire/firestore';
import { Observable, combineLatest, map, of, from, switchAll } from 'rxjs';

export interface Notification {
  id: string;
  userId: string;
  type: 'task' | 'project' | 'chat' | 'system';
  title: string;
  message: string;
  read: boolean;
  data?: {
    taskId?: string;
    projectId?: string;
    conversationId?: string;
    eventKey?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private firestore = inject(Firestore);
  
  private get notificationsCollection() {
    return collection(this.firestore, 'notifications');
  }
  
  /**
   * Get notifications for current user
   */
  getNotifications(userId: string): Observable<Notification[]> {
    return from(this.resolveNotificationUserIds(userId)).pipe(
      map(ids => Array.from(new Set(ids.filter(id => typeof id === 'string' && id.trim().length > 0)))),
      map(ids => ids.length > 0 ? ids : [userId]),
      map(ids => this.getNotificationsForUsers(ids)),
      switchAll()
    );
  }

  getNotificationsForUsers(userIds: string[]): Observable<Notification[]> {
    const uniqueIds = Array.from(new Set(userIds.filter(id => typeof id === 'string' && id.trim().length > 0)));

    if (uniqueIds.length === 0) {
      return of([]);
    }

    if (uniqueIds.length === 1) {
      return this.fetchNotificationsForUserId(uniqueIds[0]);
    }

    return combineLatest(uniqueIds.map(id => this.fetchNotificationsForUserId(id))).pipe(
      map(resultSets => {
        const merged = resultSets.flat();
        const byId = new Map<string, Notification>();

        for (const notification of merged) {
          byId.set(notification.id, notification);
        }

        return Array.from(byId.values()).sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
        );
      })
    );
  }

  private fetchNotificationsForUserId(userId: string): Observable<Notification[]> {
    const notificationsQuery = query(this.notificationsCollection, where('userId', '==', userId));

    return from(getDocs(notificationsQuery)).pipe(
      map(snapshot => {
        const notifications = snapshot.docs
          .map(snapshotDoc => {
            const notification = snapshotDoc.data() as Record<string, any>;
            return {
              id: snapshotDoc.id,
              ...notification,
              read: notification['read'] ?? notification['isRead'] ?? false,
              createdAt: this.convertTimestamp(notification['createdAt']),
              updatedAt: this.convertTimestamp(notification['updatedAt'])
            } as Notification;
          })
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

        return notifications;
      })
    );
  }
  
  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(this.firestore, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      updatedAt: serverTimestamp()
    });
  }
  
  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    const userIds = await this.resolveNotificationUserIds(userId);
    const snapshots = await Promise.all(
      userIds.map(id =>
        getDocs(
          query(
            this.notificationsCollection,
            where('userId', '==', id),
            where('read', '==', false)
          )
        )
      )
    );

    const batch = writeBatch(this.firestore);

    snapshots.forEach(snapshot => {
      snapshot.docs.forEach(docSnapshot => {
        const docRef = doc(this.firestore, 'notifications', docSnapshot.id);
        batch.update(docRef, {
          read: true,
          updatedAt: serverTimestamp()
        });
      });
    });

    await batch.commit();
  }
  
  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const notificationRef = doc(this.firestore, 'notifications', notificationId);
    await deleteDoc(notificationRef);
  }
  
  /**
   * Delete all read notifications
   */
  async deleteAllRead(userId: string): Promise<void> {
    const q = query(
      this.notificationsCollection,
      where('userId', '==', userId),
      where('read', '==', true)
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(this.firestore);
    
    snapshot.docs.forEach(docSnapshot => {
      const docRef = doc(this.firestore, 'notifications', docSnapshot.id);
      batch.delete(docRef);
    });
    
    await batch.commit();
  }
  
  /**
   * Create a new notification
   */
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const normalizedUserId = await this.normalizeRecipientUserId(notification.userId);

    const docRef = await addDoc(this.notificationsCollection, {
      ...notification,
      userId: normalizedUserId,
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  }

  async createNotificationIfNotExists(
    notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>,
    eventKey?: string
  ): Promise<string | null> {
    const normalizedUserId = await this.normalizeRecipientUserId(notification.userId);

    if (!eventKey) {
      return this.createNotification({
        ...notification,
        userId: normalizedUserId
      });
    }

    const deterministicId = `${normalizedUserId}__${eventKey}`;
    const notificationRef = doc(this.firestore, 'notifications', deterministicId);
    const existing = await getDoc(notificationRef);

    if (existing.exists()) {
      return null;
    }

    await setDoc(notificationRef, {
      ...notification,
      userId: normalizedUserId,
      read: false,
      data: {
        ...(notification.data || {}),
        eventKey
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return deterministicId;
  }

  async notifyTaskAssigned(employeeId: string, adminId: string, taskId: string, taskTitle: string): Promise<void> {
    await this.createNotification({
      userId: employeeId,
      type: 'task',
      title: 'New Task Assigned',
      message: `Admin assigned you a task: ${taskTitle}`,
      read: false,
      data: { taskId, adminId }
    });
  }

  async notifyTaskCompleted(adminId: string, employeeId: string, taskId: string, taskTitle: string): Promise<void> {
    await this.createNotificationIfNotExists(
      {
        userId: adminId,
        type: 'task',
        title: 'Task Completed',
        message: `Employee completed task: ${taskTitle}`,
        read: false,
        data: { taskId, employeeId }
      },
      `task-completed-${taskId}`
    );
  }

  async notifyTaskOverdue(
    adminId: string,
    employeeId: string,
    taskId: string,
    taskTitle: string,
    deadlineISODate: string
  ): Promise<void> {
    await this.createNotificationIfNotExists(
      {
        userId: adminId,
        type: 'system',
        title: 'Task Overdue',
        message: `Task is overdue and not completed: ${taskTitle}`,
        read: false,
        data: { taskId, employeeId, deadline: deadlineISODate }
      },
      `task-overdue-${taskId}-${deadlineISODate}`
    );
  }

  async notifyTaskReminder(
    userId: string,
    taskId: string,
    taskTitle: string,
    minutesBeforeDeadline: number
  ): Promise<void> {
    await this.createNotificationIfNotExists(
      {
        userId,
        type: 'task',
        title: 'Task Reminder',
        message: `Reminder: ${taskTitle} is due in ${minutesBeforeDeadline} minutes.`,
        read: false,
        data: { taskId, minutesBeforeDeadline }
      },
      `task-reminder-${taskId}-${minutesBeforeDeadline}`
    );
  }

  async notifyChatMessage(
    recipientId: string,
    senderId: string,
    senderName: string,
    conversationId: string
  ): Promise<void> {
    await this.createNotification({
      userId: recipientId,
      type: 'chat',
      title: 'New Message',
      message: `New message from ${senderName}`,
      read: false,
      data: { senderId, conversationId }
    });
  }
  
  /**
   * Convert Firestore Timestamp to Date
   */
  private convertTimestamp(timestamp: any): Date {
    if (timestamp?.toDate) {
      return timestamp.toDate();
    } else if (timestamp instanceof Date) {
      return timestamp;
    } else if (timestamp?.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    return new Date();
  }

  private async normalizeRecipientUserId(userId: string): Promise<string> {
    if (!userId || typeof userId !== 'string') {
      return userId;
    }

    const trimmedUserId = userId.trim();
    if (!trimmedUserId) {
      return userId;
    }

    try {
      const directUserDoc = await getDoc(doc(this.firestore, 'users', trimmedUserId));
      if (directUserDoc.exists()) {
        const data = directUserDoc.data();
        if (typeof data['uid'] === 'string' && data['uid'].trim().length > 0) {
          return data['uid'].trim();
        }
      }

      const byUidQuery = query(
        collection(this.firestore, 'users'),
        where('uid', '==', trimmedUserId)
      );
      const byUidSnapshot = await getDocs(byUidQuery);
      if (byUidSnapshot.docs.length > 0) {
        return trimmedUserId;
      }
    } catch (error) {
      console.warn('Could not normalize notification recipient ID:', error);
    }

    return trimmedUserId;
  }

  private async resolveNotificationUserIds(userId: string): Promise<string[]> {
    const ids = new Set<string>();
    if (!userId || typeof userId !== 'string') {
      return [];
    }

    const trimmedUserId = userId.trim();
    if (!trimmedUserId) {
      return [];
    }

    ids.add(trimmedUserId);

    try {
      const directUserDoc = await getDoc(doc(this.firestore, 'users', trimmedUserId));
      if (directUserDoc.exists()) {
        ids.add(directUserDoc.id);
        const data = directUserDoc.data();
        if (typeof data['uid'] === 'string' && data['uid'].trim().length > 0) {
          ids.add(data['uid'].trim());
        }
      }

      const byUidQuery = query(collection(this.firestore, 'users'), where('uid', '==', trimmedUserId));
      const byUidSnapshot = await getDocs(byUidQuery);
      byUidSnapshot.docs.forEach(snapshotDoc => {
        ids.add(snapshotDoc.id);
        const data = snapshotDoc.data();
        if (typeof data['uid'] === 'string' && data['uid'].trim().length > 0) {
          ids.add(data['uid'].trim());
        }
      });
    } catch (error) {
      console.warn('Could not resolve notification user IDs:', error);
    }

    return Array.from(ids);
  }
}