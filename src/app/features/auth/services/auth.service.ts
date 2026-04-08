import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';
import { AuthStore } from '../../../store/auth/auth.store';
import { AuthService as LegacyAuthService } from '../../../services/auth-service/auth-service';

@Injectable({ providedIn: 'root' })
export class FeatureAuthService {
	private readonly authStore = inject(AuthStore);
	private readonly authService = inject(LegacyAuthService);

	readonly user$: Observable<User | null> = this.authService.getAuthState();

	async login(email: string, password: string): Promise<void> {
		this.authStore.setLoading(true);

		try {
			await this.authService.login(email, password);
			await this.syncStoreFromCurrentUser();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unable to sign in.';
			this.authStore.setError(message);
			throw error;
		} finally {
			this.authStore.setLoading(false);
		}
	}

	async register(email: string, password: string, role: 'admin' | 'employee' = 'employee'): Promise<void> {
		this.authStore.setLoading(true);

		try {
			await this.authService.register(email, password, role);
			await this.syncStoreFromCurrentUser();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unable to register account.';
			this.authStore.setError(message);
			throw error;
		} finally {
			this.authStore.setLoading(false);
		}
	}

	async logout(): Promise<void> {
		await this.authService.logout();
		this.authStore.clear();
	}

	async getCurrentUserRole(): Promise<'admin' | 'employee' | null> {
		const role = await this.authService.getCurrentUserRole();
		return role === 'admin' || role === 'employee' ? role : null;
	}

	private async syncStoreFromCurrentUser(): Promise<void> {
		const currentUser = this.authService.getCurrentUser();

		if (!currentUser) {
			this.authStore.clear();
			return;
		}

		const role = await this.getCurrentUserRole();
		if (!role) {
			this.authStore.setError('Unable to resolve user role.');
			return;
		}

		this.authStore.setUser(currentUser.uid, currentUser.email, role);
	}
}
