import { Injectable, inject, DestroyRef, signal, computed } from '@angular/core';
import { ChatService } from '../api/chat-api.service';
import { User } from '../../models/models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

interface DashboardMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: Date | any;
  isRead: boolean;
  conversationId: string;
  read?: boolean;
}

/**
 * ChatFacadeService - Encapsulates all chat interaction logic for dashboards
 * Handles conversation selection, message loading, sending, and UI interactions
 */
@Injectable({
  providedIn: 'root'
})
export class ChatFacadeService {
  private chatService = inject(ChatService);
  private destroyRef = inject(DestroyRef);

  // Signals
  chatMessages = signal<DashboardMessage[]>([]);
  selectedConversation = signal<DashboardConversation | null>(null);

  // Computed
  unreadMessageCount = computed(() => {
    return this.chatMessages().filter(msg => !msg.read).length;
  });

  constructor() {}

  /**
   * Load messages between two users with real-time subscription
   */
  loadMessages(
    userId1: string,
    userId2: string,
    options?: {
      onMessages?: (messages: DashboardMessage[]) => void;
      onError?: (error: any) => void;
      onAfterLoad?: () => void;
    }
  ): void {
    console.log('📨 Loading messages between', userId1, 'and', userId2);

    this.chatService.getConversationMessages(userId1, userId2)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (messages) => {
          console.log('Messages loaded (realtime):', messages.length);
          this.chatMessages.set(messages as DashboardMessage[]);
          options?.onMessages?.(messages as DashboardMessage[]);
          options?.onAfterLoad?.();
          this.scrollToBottom();
        },
        error: (error: any) => {
          console.error('❌ Subscription error in loadMessages:', error);
          this.chatMessages.set([]);
          options?.onError?.(error);
        }
      });
  }

  /**
   * Send a chat message
   */
  async sendMessage(
    senderId: string,
    senderName: string,
    senderRole: 'admin' | 'employee',
    recipientId: string,
    messageContent: string
  ): Promise<void> {
    const trimmedMessage = messageContent.trim();
    
    if (!trimmedMessage) {
      console.warn('Cannot send empty message');
      return;
    }

    try {
      await this.chatService.sendMessage(
        senderId,
        senderName,
        senderRole,
        recipientId,
        trimmedMessage
      );
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  /**
   * Select a conversation and load its messages
   */
  selectConversation(
    conversation: DashboardConversation,
    currentUserId: string,
    event?: Event
  ): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    console.log('Selecting conversation with:', conversation);

    this.selectedConversation.set(conversation);

    // Load messages for this conversation
    if (conversation.employeeId) {
      // Admin view: conversation has employeeId
      this.loadMessages(currentUserId, conversation.employeeId);
    } else if (conversation.adminId) {
      // Employee view: conversation has adminId
      this.loadMessages(currentUserId, conversation.adminId);
    }

    // Mark as seen after loading
    this.markConversationSeen(currentUserId, conversation);
  }

  /**
   * Select an admin and initiate conversation (for employees)
   */
  selectAdmin(admin: User, currentUserId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    console.log('Employee selecting admin:', admin.name);

    // Create a conversation-like object
    const conversation: DashboardConversation = {
      id: `${currentUserId}_${admin.id}`,
      adminId: admin.id,
      employeeId: currentUserId,
      adminName: admin.name,
      employeeName: admin.email || 'Employee',
      lastMessage: '',
      lastMessageTime: new Date(),
      unreadCount: 0
    };

    this.selectConversation(conversation, currentUserId, event);
  }

  /**
   * Mark conversation as read/seen
   */
  async markConversationAsRead(userId1: string, userId2: string, readerId: string): Promise<void> {
    try {
      await this.chatService.markConversationAsRead(userId1, userId2, readerId);
      console.log('✅ Conversation marked as seen');
    } catch (error) {
      console.error('❌ Error marking conversation as seen:', error);
      throw error;
    }
  }

  /**
   * Mark conversation as read/seen
   */
  private async markConversationSeen(
    userId1: string,
    conversation: DashboardConversation
  ): Promise<void> {
    try {
      const userId2 = conversation.employeeId || conversation.adminId;
      if (!userId2) return;

      await this.markConversationAsRead(userId1, userId2, userId1);
    } catch (error) {
      console.error('❌ Error marking conversation as seen:', error);
    }
  }

  /**
   * Scroll chat messages container to bottom
   */
  private scrollToBottom(): void {
    setTimeout(() => {
      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }

  /**
   * Clear chat state
   */
  clearChat(): void {
    this.chatMessages.set([]);
    this.selectedConversation.set(null);
  }
}

