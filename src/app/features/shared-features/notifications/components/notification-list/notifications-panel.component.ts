import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Notification } from '../../../../../services/api/notification-api.service';

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notifications-panel">
      <div class="notifications-header">
        <h3>Notifications</h3>
        <button class="btn-icon" (click)="clearAll.emit()"><span class="material-symbols-rounded app-icon">cleaning_services</span></button>
      </div>
      <div class="notifications-list">
        @if (notifications.length > 0) {
          @for (notification of notifications; track notification.id) {
            <div class="notification-item" [class.unread]="!notification.read">
              <div class="notification-icon">
                @if (notification.type === 'task') { <span class="material-symbols-rounded app-icon">task_alt</span> }
                @if (notification.type === 'project') { <span class="material-symbols-rounded app-icon">folder</span> }
                @if (notification.type === 'chat') { <span class="material-symbols-rounded app-icon">chat</span> }
                @if (notification.type === 'system') { <span class="material-symbols-rounded app-icon">warning</span> }
              </div>
              <div class="notification-content">
                <p>{{ notification.message }}</p>
                <small>{{ getDate(notification.createdAt) | date: 'MMM dd, HH:mm' }}</small>
              </div>
              @if (!notification.read) {
                <button class="btn-icon small" (click)="markAsRead.emit(notification.id)">✓</button>
              }
            </div>
          }
        } @else {
          <div class="empty-notifications">
            <p>No notifications</p>
          </div>
        }
      </div>
    </div>
  `
})
export class AppNotificationsPanelComponent {
  @Input() notifications: Notification[] = [];

  @Output() clearAll = new EventEmitter<void>();
  @Output() markAsRead = new EventEmitter<string>();

  getDate(value: any): Date {
    if (value?.toDate) {
      return value.toDate();
    }
    return value instanceof Date ? value : new Date(value);
  }
}
