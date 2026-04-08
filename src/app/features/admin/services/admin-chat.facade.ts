import { Injectable, inject } from '@angular/core';
import { AdminDashboardDataService } from '../../../services/dashboard/admin-dashboard-data.service';
import { ChatFacadeService } from '../../../services/dashboard/chat-facade.service';

export interface AdminDashboardConversation {
  id: string;
  adminId: string;
  employeeId: string;
  adminName: string;
  employeeName: string;
  lastMessage: string;
  lastMessageTime: Date | any;
  unreadCount: number;
}

export interface AdminDashboardMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: Date | any;
  isRead: boolean;
  conversationId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminChatFacade {
  private adminDashboardDataService = inject(AdminDashboardDataService);
  private chatFacadeService = inject(ChatFacadeService);

  async loadConversations(adminId: string): Promise<AdminDashboardConversation[]> {
    if (!adminId) {
      return [];
    }

    try {
      const conversations = await this.adminDashboardDataService.getAdminConversations(adminId);
      return conversations as AdminDashboardConversation[];
    } catch (error: any) {
      console.error('❌ Error loading conversations with getDocs:', error);
      if (error?.code === 'failed-precondition') {
        console.error('🔧 Firestore index required! Collection: conversations, Fields: adminId asc + lastMessageTime desc');
      }
      return [];
    }
  }

  loadMessages(
    userId1: string,
    userId2: string,
    handlers: {
      onMessages: (messages: AdminDashboardMessage[]) => void;
      onAfterLoad?: () => void;
      onError?: () => void;
    }
  ): void {
    this.chatFacadeService.loadMessages(userId1, userId2, {
      onMessages: (messages) => handlers.onMessages(messages as AdminDashboardMessage[]),
      onAfterLoad: () => handlers.onAfterLoad?.(),
      onError: () => handlers.onError?.()
    });
  }

  async markConversationSeen(userId1: string, userId2: string, currentUserId: string): Promise<void> {
    await this.chatFacadeService.markConversationAsRead(userId1, userId2, currentUserId);
  }

  async sendMessage(
    currentUserId: string,
    userName: string,
    recipientId: string,
    messageContent: string
  ): Promise<void> {
    await this.chatFacadeService.sendMessage(currentUserId, userName, 'admin', recipientId, messageContent);
  }
}
