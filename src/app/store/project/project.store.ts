import { Injectable, computed, signal } from '@angular/core';
import { Project } from '../../models/models';
import { ProjectState } from './project.state';

const initialState: ProjectState = {
	items: [],
	loading: false,
	error: null,
};

@Injectable({ providedIn: 'root' })
export class ProjectStore {
	private readonly state = signal<ProjectState>(initialState);

	readonly projects = computed(() => this.state().items);
	readonly loading = computed(() => this.state().loading);

	setProjects(items: Project[]): void {
		this.state.update((current) => ({ ...current, items, error: null }));
	}

	upsertProject(item: Project): void {
		this.state.update((current) => {
			const exists = current.items.some((project) => project.id === item.id);
			const items = exists
				? current.items.map((project) => (project.id === item.id ? item : project))
				: [...current.items, item];
			return { ...current, items };
		});
	}

	removeProject(projectId: string): void {
		this.state.update((current) => ({
			...current,
			items: current.items.filter((project) => project.id !== projectId),
		}));
	}
}
