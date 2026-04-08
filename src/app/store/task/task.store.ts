import { Injectable, computed, signal } from '@angular/core';
import { Task } from '../../models/models';
import { TaskState } from './task.state';

const initialState: TaskState = {
	items: [],
	loading: false,
	error: null,
};

@Injectable({ providedIn: 'root' })
export class TaskStore {
	private readonly state = signal<TaskState>(initialState);

	readonly tasks = computed(() => this.state().items);
	readonly loading = computed(() => this.state().loading);

	setTasks(items: Task[]): void {
		this.state.update((current) => ({ ...current, items, error: null }));
	}

	upsertTask(item: Task): void {
		this.state.update((current) => {
			const exists = current.items.some((task) => task.id === item.id);
			const items = exists
				? current.items.map((task) => (task.id === item.id ? item : task))
				: [...current.items, item];
			return { ...current, items };
		});
	}

	removeTask(taskId: string): void {
		this.state.update((current) => ({
			...current,
			items: current.items.filter((task) => task.id !== taskId),
		}));
	}
}
