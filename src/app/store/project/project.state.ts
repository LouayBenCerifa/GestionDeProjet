import { Project } from '../../models/models';

export interface ProjectState {
	items: Project[];
	loading: boolean;
	error: string | null;
}
