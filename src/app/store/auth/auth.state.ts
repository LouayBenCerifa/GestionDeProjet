export interface AuthState {
	uid: string | null;
	email: string | null;
	role: 'admin' | 'employee' | null;
	loading: boolean;
	error: string | null;
}
