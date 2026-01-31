// services/notification.service.ts
import { inject, Injectable, signal } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  doc, 
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  getDocs,
  writeBatch
} from '@angular/fire/firestore';
import { Observable, map, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';

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
    [key: string]: any;
  };
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  
  private notificationsCollection = collection(this.firestore, 'notifications');
  
  /**
   * Get notifications for current user
   */
  getNotifications(userId: string): Observable<Notification[]> {
    const q = query(
      this.notificationsCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return collectionData(q, { idField: 'id' }).pipe(
      map(notifications => notifications.map(notification => ({
        ...notification,
        createdAt: this.convertTimestamp(notification['createdAt']),
        updatedAt: this.convertTimestamp(notification['updatedAt'])
      })) as Notification[])
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
    const q = query(
      this.notificationsCollection,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(this.firestore);
    
    snapshot.docs.forEach(docSnapshot => {
      const docRef = doc(this.firestore, 'notifications', docSnapshot.id);
      batch.update(docRef, {
        read: true,
        updatedAt: serverTimestamp()
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
    const docRef = await addDoc(this.notificationsCollection, {
      ...notification,
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
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
}