import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private firestore: Firestore) {}

  getUserNotifications(userId: string): Observable<any[]> {
    const notificationsRef = collection(this.firestore, 'notifications');
    const q = query(notificationsRef, where('userId', '==', userId));
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }

  async sendNotification(userId: string, message: string) {
    const notificationsRef = collection(this.firestore, 'notifications');
    await addDoc(notificationsRef, {
      userId,
      message,
      read: false,
      timestamp: new Date()
    });
  }

  async markAsRead(notificationId: string) {
    // Implement mark as read logic
  }
}
