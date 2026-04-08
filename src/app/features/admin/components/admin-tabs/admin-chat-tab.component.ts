import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-chat-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    @if (ctx; as c) {
      <section class="content">
        <div class="section-header">
          <h2>Chat with Employees</h2>
        </div>

        <div class="chat-container">
          <div class="chat-sidebar">
            <div class="chat-sidebar-header">
              <h3 class="chat-sidebar-title">Conversations</h3>
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
                      <img [src]="'https://ui-avatars.com/api/?name=' + conv.employeeName" alt="Employee">
                    </div>
                    <div class="conv-info">
                      <h4>{{ conv.employeeName }}</h4>
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
                  <small>Messages from employees will appear here</small>
                </div>
              }
            </div>
            </div>
          </div>

          <div class="chat-main">
            @if (c.selectedConversation()) {
              <div class="chat-header">
                <div class="chat-title-wrap">
                  <h3>Chat with {{ c.selectedConversation()?.employeeName }}</h3>
                  <p class="chat-subtitle">Realtime conversation</p>
                </div>
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
                  <p>Select a conversation to start chatting</p>
                </div>
              </div>
            }
          </div>
        </div>
      </section>
    }
  `
})
export class AppAdminChatTabComponent {
  @Input() ctx: any;
}
