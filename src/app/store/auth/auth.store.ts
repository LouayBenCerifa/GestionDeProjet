import { Injectable, computed, signal } from '@angular/core';
import { AuthState } from './auth.state';

const initialState: AuthState = {
	uid: null,
	email: null,
	role: null,
	loading: false,
	error: null,
};

@Injectable({ providedIn: 'root' })
export class AuthStore {
	private readonly state = signal<AuthState>(initialState);

	readonly snapshot = computed(() => this.state());
	readonly isAuthenticated = computed(() => !!this.state().uid);

	setLoading(loading: boolean): void {
		this.state.update((current) => ({ ...current, loading }));
	}

	setError(error: string | null): void {
		this.state.update((current) => ({ ...current, error }));
	}

	setUser(uid: string, email: string | null, role: 'admin' | 'employee'): void {
		this.state.update((current) => ({ ...current, uid, email, role, error: null }));
	}

	clear(): void {
		this.state.set(initialState);
	}
}
