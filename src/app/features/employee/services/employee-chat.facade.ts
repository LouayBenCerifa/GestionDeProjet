import { Injectable, inject } from '@angular/core';
import { EmployeeDashboardDataService } from '../../../services/dashboard/employee-dashboard-data.service';
import { ChatFacadeService } from '../../../services/dashboard/chat-facade.service';

export interface EmployeeDashboardConversation {
  id: string;
  adminId: string;
  employeeId: string;
  adminName: string;
  employeeName: string;
  lastMessage: string;
  lastMessageTime: Date | any;
  unreadCount: number;
}

export interface EmployeeDashboardMessage {
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
export class EmployeeChatFacade {
  private employeeDashboardDataService = inject(EmployeeDashboardDataService);
  private chatFacadeService = inject(ChatFacadeService);

  async loadConversations(employeeId: string, employeeName: string): Promise<EmployeeDashboardConversation[]> {
    if (!employeeId) {
      return [];
    }

    try {
      const conversations = await this.employeeDashboardDataService.getEmployeeConversations(employeeId, employeeName);
      return conversations as EmployeeDashboardConversation[];
    } catch (error: any) {
      console.error('❌ Error loading conversations:', error);
      return [];
    }
  }

  loadMessages(
    userId1: string,
    userId2: string,
    handlers: {
      onMessages: (messages: EmployeeDashboardMessage[]) => void;
      onAfterLoad?: () => void;
      onError?: () => void;
    }
  ): void {
    this.chatFacadeService.loadMessages(userId1, userId2, {
      onMessages: (messages) => handlers.onMessages(messages as EmployeeDashboardMessage[]),
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
    await this.chatFacadeService.sendMessage(currentUserId, userName, 'employee', recipientId, messageContent);
  }

  clearChat(): void {
    this.chatFacadeService.clearChat();
  }
}
