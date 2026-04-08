import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'timeRemaining',
	standalone: true,
})
export class TimeRemainingPipe implements PipeTransform {
	transform(value: Date | string | number | null | undefined): string {
		if (!value) {
			return 'No deadline';
		}

		const deadline = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(deadline.getTime())) {
			return 'Invalid date';
		}

		const diffMs = deadline.getTime() - Date.now();
		const isOverdue = diffMs < 0;
		const absMs = Math.abs(diffMs);
		const totalMinutes = Math.floor(absMs / 60000);
		const totalHours = Math.floor(totalMinutes / 60);
		const totalDays = Math.floor(totalHours / 24);

		let text = '';
		if (totalDays > 0) {
			text = `${totalDays}d ${totalHours % 24}h`;
		} else if (totalHours > 0) {
			text = `${totalHours}h ${totalMinutes % 60}m`;
		} else {
			text = `${Math.max(1, totalMinutes)}m`;
		}

		return isOverdue ? `Overdue by ${text}` : `${text} remaining`;
	}
}
