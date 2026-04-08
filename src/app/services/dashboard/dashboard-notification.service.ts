import { Injectable, inject } from '@angular/core';
import { NotificationService } from '../api/notification-api.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardNotificationService {
  private notificationService = inject(NotificationService);

  getNotificationDate(value: any): Date {
    if (value?.toDate) {
      return value.toDate();
    }
    return value instanceof Date ? value : new Date(value);
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationService.markAsRead(notificationId);
  }

  async clearAllForUser(userId: string): Promise<void> {
    await this.notificationService.deleteAllForUser(userId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationService.markAllAsRead(userId);
  }
}
