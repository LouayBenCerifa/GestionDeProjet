import { Injectable, inject } from '@angular/core';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  Firestore,
  Timestamp,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { ChatMessage, Conversation } from '../interfaces/models';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private firestore = inject(Firestore);
  private notificationService = inject(NotificationService);

  /**
   * Send a message from admin to employee
   */
  async sendMessage(
    senderId: string,
    senderName: string,
    senderRole: 'admin' | 'employee',
    recipientId: string,
    content: string
  ): Promise<string> {
    // Use sorted IDs for consistent conversation ID
    const conversationId = this.generateConversationId(senderId, recipientId);

    const messagesRef = collection(this.firestore, 'messages');
    const messageData: Omit<ChatMessage, 'id'> = {
      senderId,
      senderName,
      senderRole,
      recipientId,
      content,
      timestamp: new Date(),
      isRead: false,
      conversationId,
    };

    try {
      const docRef = await addDoc(messagesRef, {
        ...messageData,
        timestamp: Timestamp.fromDate(messageData.timestamp),
      });

      // Update conversation
      await this.updateConversation(
        conversationId,
        senderId,
        senderName,
        senderRole,
        recipientId,
        content
      );

      const recipientIds = await this.expandNotificationRecipients(recipientId);
      for (const resolvedRecipientId of recipientIds) {
        await this.notificationService.notifyChatMessage(
          resolvedRecipientId,
          senderId,
          senderName,
          conversationId
        );
      }

      return docRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get all messages in a conversation between admin and employee
   */
  getConversationMessages(adminId: string, employeeId: string): Observable<ChatMessage[]> {
    const conversationId = this.generateConversationId(adminId, employeeId);

    const messagesRef = collection(this.firestore, 'messages');
    const messagesQuery = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );

    return new Observable<ChatMessage[]>((subscriber) => {
      const unsubscribe = onSnapshot(
        messagesQuery,
        (snapshot) => {
          const messages = snapshot.docs.map((snapshotDoc) => {
            const msg = snapshotDoc.data() as any;
            return {
              id: snapshotDoc.id,
              ...msg,
              timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : msg.timestamp,
            } as ChatMessage;
          });
          subscriber.next(messages);
        },
        (error) => subscriber.error(error)
      );

      return () => unsubscribe();
    });
  }

  /**
   * Get all conversations for a user (admin or employee)
   */
  getUserConversations(userId: string, userRole: 'admin' | 'employee'): Observable<Conversation[]> {
    const conversationsRef = collection(this.firestore, 'conversations');

    const field = userRole === 'admin' ? 'adminId' : 'employeeId';
    const conversationsQuery = query(
      conversationsRef,
      where(field, '==', userId),
      orderBy('lastMessageTime', 'desc')
    );

    return new Observable<Conversation[]>((subscriber) => {
      const unsubscribe = onSnapshot(
        conversationsQuery,
        (snapshot) => {
          const conversations = snapshot.docs.map((snapshotDoc) => {
            const conv = snapshotDoc.data() as any;
            return {
              id: snapshotDoc.id,
              ...conv,
              lastMessageTime: conv.lastMessageTime?.toDate ? conv.lastMessageTime.toDate() : conv.lastMessageTime,
            } as Conversation;
          });
          subscriber.next(conversations);
        },
        (error) => subscriber.error(error)
      );

      return () => unsubscribe();
    });
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string): Promise<void> {
    const messageRef = doc(this.firestore, 'messages', messageId);
    await updateDoc(messageRef, { isRead: true });
  }

  /**
   * Get unread message count for a user
   */
  getUnreadMessageCount(userId: string): Observable<number> {
    const messagesRef = collection(this.firestore, 'messages');
    const unreadQuery = query(
      messagesRef,
      where('recipientId', '==', userId),
      where('isRead', '==', false)
    );

    return new Observable<number>((subscriber) => {
      const unsubscribe = onSnapshot(
        unreadQuery,
        (snapshot) => subscriber.next(snapshot.size),
        (error) => subscriber.error(error)
      );

      return () => unsubscribe();
    });
  }

  /**
   * Get all employees for admin (to start a new chat)
   */
  async getEmployeesForChat(adminId: string): Promise<any[]> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('role', '==', 'employee'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Private helper: Generate conversation ID
   */
  private generateConversationId(userId1: string, userId2: string): string {
    // Sort IDs to ensure consistency regardless of sender/recipient order
    const ids = [userId1, userId2].sort();
    return `${ids[0]}_${ids[1]}`;
  }

  /**
   * Private helper: Update conversation metadata
   */
  private async updateConversation(
    conversationId: string,
    senderId: string,
    senderName: string,
    senderRole: 'admin' | 'employee',
    recipientId: string,
    lastMessage: string
  ): Promise<void> {
    const conversationRef = doc(this.firestore, 'conversations', conversationId);

    // Check if conversation exists
    const existingConversation = await getDoc(conversationRef);

    if (existingConversation.exists()) {
      // Update existing conversation
      await updateDoc(conversationRef, {
        lastMessage,
        lastMessageTime: Timestamp.now(),
      });
    } else {
      const isAdminSender = senderRole === 'admin';

      await setDoc(conversationRef, {
        adminId: isAdminSender ? senderId : recipientId,
        employeeId: isAdminSender ? recipientId : senderId,
        adminName: isAdminSender ? senderName : 'Admin',
        employeeName: isAdminSender ? 'Employee' : senderName,
        lastMessage,
        lastMessageTime: Timestamp.now(),
        unreadCount: 1,
      });
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
      console.warn('Could not expand chat notification recipient:', userId, error);
    }

    return Array.from(recipients);
  }
}