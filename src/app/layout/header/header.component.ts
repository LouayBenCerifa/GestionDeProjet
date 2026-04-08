import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-dashboard-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="top-bar">
      <h1>{{ title }}</h1>
      <div class="header-right">
        <div class="notifications" (click)="toggleNotifications.emit()"><span class="material-symbols-rounded app-icon">notifications</span>
          @if (unreadCount > 0) {
            <span class="notification-badge">{{ unreadCount }}</span>
          }
        </div>
        <div class="user-profile">
          <img [src]="'https://ui-avatars.com/api/?name=' + userName" alt="User">
          <div>
            <p class="user-name">{{ userName }}</p>
            <p class="user-role">{{ roleLabel }}</p>
          </div>
        </div>
      </div>
    </header>
  `
})
export class AppTopbarComponent {
  @Input() title = 'Dashboard';
  @Input() unreadCount = 0;
  @Input() userName = 'User';
  @Input() roleLabel = '';

  @Output() toggleNotifications = new EventEmitter<void>();
}
