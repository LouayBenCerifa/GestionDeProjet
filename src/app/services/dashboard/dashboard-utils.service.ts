import { Injectable } from '@angular/core';
import { Task, User } from '../../models/models';

@Injectable({
  providedIn: 'root'
})
export class DashboardUtilsService {
  getTabTitle<T extends string>(activeTab: T, titles: Record<T, string>, fallback = 'Dashboard'): string {
    return titles[activeTab] || fallback;
  }

  parseNumberList(value: string): number[] {
    if (!value || typeof value !== 'string') {
      return [];
    }

    return value
      .split(',')
      .map(item => Number(item.trim()))
      .filter(item => !Number.isNaN(item) && item > 0)
      .map(item => Math.round(item));
  }

  parseEmployeeSelectionInput(input: string, employees: User[]): string[] {
    const selectedIndices = input
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item > 0 && item <= employees.length);

    const selectedIds = selectedIndices.map((index) => employees[index - 1].id);
    return Array.from(new Set(selectedIds));
  }

  getVerificationSubmittedAt(task: Task): Date {
    const raw = task.verification?.submittedAt;
    if ((raw as any)?.toDate) {
      return (raw as any).toDate();
    }
    if (raw instanceof Date) {
      return raw;
    }
    return task.updatedAt instanceof Date ? task.updatedAt : new Date(task.updatedAt || new Date());
  }

  isTaskOverdue(task: Task, now = Date.now()): boolean {
    if (!task.deadline) {
      return false;
    }

    const deadline = this.toDate(task.deadline);
    deadline.setHours(23, 59, 59, 999);
    return deadline.getTime() < now && task.status !== 'done';
  }

  toDate(value: any): Date {
    if (value?.toDate) {
      return value.toDate();
    }

    return value instanceof Date ? value : new Date(value);
  }
}

