import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DateUtilsService {
  toDate(value: unknown, fallback = new Date()): Date {
    if (value instanceof Date) {
      return value;
    }

    if (value && typeof value === 'object' && 'toDate' in (value as any)) {
      return (value as any).toDate();
    }

    const parsed = new Date(String(value ?? ''));
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }

  isOverdue(deadline: unknown, now = Date.now()): boolean {
    const date = this.toDate(deadline);
    date.setHours(23, 59, 59, 999);
    return date.getTime() < now;
  }

  isDueInRange(deadline: unknown, from: Date, to: Date): boolean {
    const date = this.toDate(deadline);
    return date >= from && date <= to;
  }
}
