import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StatusUtilsService {
  isTaskDone(status: string | null | undefined): boolean {
    return (status || '').toLowerCase() === 'done';
  }

  isTaskPendingVerification(status: string | null | undefined): boolean {
    return (status || '').toLowerCase() === 'pending-approval';
  }

  normalizeStatus(status: string | null | undefined): string {
    return (status || '').trim().toLowerCase();
  }

  getStatusColorClass(status: string | null | undefined): string {
    switch (this.normalizeStatus(status)) {
      case 'done':
      case 'completed':
      case 'approved':
        return 'text-green-600';
      case 'in-progress':
      case 'pending-approval':
        return 'text-amber-600';
      case 'rejected':
      case 'overdue':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  }
}
