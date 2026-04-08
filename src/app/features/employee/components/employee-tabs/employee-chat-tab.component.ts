import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-employee-chat-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    @if (ctx; as c) {
      <section class="content">
        <div class="section-header">
          <h2>Chat with Administrators</h2>
          <button class="btn btn-primary" (click)="c.startNewChat()" *ngIf="c.admins().length > 0">+ New Chat</button>
        </div>

        <div class="chat-container">
          <div class="chat-sidebar">
            <div class="chat-sidebar-header">
              <h3 class="chat-sidebar-title">Administrators</h3>
              <span class="chat-count-chip">{{ c.admins().length }}</span>
            </div>
            <div class="chat-list-block">
            <div class="admins-list">
              @if (c.admins().length > 0) {
                @for (admin of c.admins(); track admin.id) {
                  <div class="admin-item"
                       [class.active]="c.selectedAdmin()?.id === admin.id"
                       (click)="c.selectAdmin(admin, $event)">
                    <div class="admin-avatar">
                      <img [src]="'https://ui-avatars.com/api/?name=' + admin.name" alt="Admin">
                    </div>
                    <div class="admin-info">
                      <h4>{{ admin.name }}</h4>
                      <p class="admin-email">{{ admin.email }}</p>
                    </div>
                    @if (c.getUnreadCount(admin.id) > 0) {
                      <span class="unread-badge">{{ c.getUnreadCount(admin.id) }}</span>
                    }
                  </div>
                }
              } @else {
                <div class="empty-admins chat-empty-state">
                  <span class="material-symbols-rounded">supervisor_account</span>
                  <p>No administrators available</p>
                </div>
              }
            </div>
            </div>

            <div class="chat-sidebar-header secondary">
              <h3 class="chat-sidebar-title">Recent Chats</h3>
              <span class="chat-count-chip">{{ c.conversations().length }}</span>
            </div>
            <div class="chat-list-block">
            <div class="conversations-list">
              @if (c.conversations().length > 0) {
                @for (conv of c.conversations(); track conv.id) {
                  <div class="conversation-item"
                       [class.active]="c.selectedConversation()?.id === conv.id"
                       (click)="c.selectConversation(conv, $event)">
                    <div class="conv-avatar">
                      <img [src]="'https://ui-avatars.com/api/?name=' + conv.adminName" alt="Admin">
                    </div>
                    <div class="conv-info">
                      <h4>{{ conv.adminName }}</h4>
                      <p class="conv-preview">{{ conv.lastMessage }}</p>
                      <small class="conv-time">{{ conv.lastMessageTime | date: 'MMM dd, HH:mm' }}</small>
                    </div>
                    @if (conv.unreadCount > 0) {
                      <span class="unread-badge">{{ conv.unreadCount }}</span>
                    }
                  </div>
                }
              } @else {
                <div class="empty-conversations chat-empty-state">
                  <span class="material-symbols-rounded">forum</span>
                  <p>No conversations yet</p>
                </div>
              }
            </div>
            </div>
          </div>

          <div class="chat-main">
            @if (c.selectedConversation() || c.selectedAdmin()) {
              <div class="chat-header">
                <div class="chat-title-wrap">
                  <h3>Chat with {{ c.selectedAdmin()?.name || c.selectedConversation()?.adminName || 'Administrator' }}</h3>
                  <p class="chat-subtitle">Realtime conversation</p>
                </div>
                <button class="btn-icon" (click)="c.clearChat()"><span class="material-symbols-rounded app-icon">cleaning_services</span></button>
              </div>
              <div class="messages-container">
                @if (c.chatMessages().length > 0) {
                  @for (msg of c.chatMessages(); track msg.id) {
                    <div class="message" [class.sent]="msg.senderId === c.currentUserId()">
                      <div class="message-bubble">
                        <p>{{ msg.content }}</p>
                        <div class="message-meta">
                          <small>{{ msg.timestamp | date: 'HH:mm' }}</small>
                          @if (msg.senderId === c.currentUserId()) {
                            <span class="seen-state" [class.seen]="msg.isRead">{{ msg.isRead ? 'Seen' : 'Sent' }}</span>
                          }
                        </div>
                      </div>
                    </div>
                  }
                } @else {
                  <div class="no-messages">
                    <div class="chat-empty-state">
                      <span class="material-symbols-rounded">chat_bubble</span>
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                }
              </div>
              <div class="chat-input-area">
                <input type="text"
                       placeholder="Type your message..."
                       [(ngModel)]="c.chatMessage"
                       (keydown.enter)="c.sendChatMessage()"
                       class="chat-input">
                <button class="btn-icon chat-send-btn" (click)="c.sendChatMessage()" aria-label="Send message"><span class="material-symbols-rounded app-icon">send</span></button>
              </div>
            } @else {
              <div class="no-conversation">
                <div class="chat-empty-state">
                  <span class="material-symbols-rounded">mark_chat_unread</span>
                  <p>Select an administrator or conversation to start chatting</p>
                </div>
              </div>
            }
          </div>
        </div>
      </section>
    }
  `
})
export class AppEmployeeChatTabComponent {
  @Input() ctx: any;
}
