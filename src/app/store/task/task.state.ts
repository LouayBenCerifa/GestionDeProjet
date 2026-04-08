import { Task } from '../../models/models';

export interface TaskState {
	items: Task[];
	loading: boolean;
	error: string | null;
}
