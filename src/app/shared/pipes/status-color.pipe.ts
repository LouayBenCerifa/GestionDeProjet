import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'statusColor',
	standalone: true,
})
export class StatusColorPipe implements PipeTransform {
	transform(status: string | null | undefined): string {
		switch ((status || '').toLowerCase()) {
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
