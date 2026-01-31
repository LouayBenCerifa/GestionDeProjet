import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChatMessage, Conversation } from '../interfaces/models';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private firestore = inject(Firestore);

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
      await this.updateConversation(conversationId, senderId, senderName, content);

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

    return collectionData(messagesQuery, { idField: 'id' }).pipe(
      map((messages: any[]) =>
        messages.map((msg) => ({
          ...msg,
          timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : msg.timestamp,
        }))
      )
    ) as Observable<ChatMessage[]>;
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

    return collectionData(conversationsQuery, { idField: 'id' }).pipe(
      map((conversations: any[]) =>
        conversations.map((conv) => ({
          ...conv,
          lastMessageTime: conv.lastMessageTime?.toDate
            ? conv.lastMessageTime.toDate()
            : conv.lastMessageTime,
        }))
      )
    ) as Observable<Conversation[]>;
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

    return collectionData(unreadQuery).pipe(map((messages) => messages.length));
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
      // Create new conversation (will be handled by admin/employee service)
    }
  }
}