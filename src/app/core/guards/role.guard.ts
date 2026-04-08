import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth-service/auth-service';

const checkRole = async (expectedRole: string): Promise<boolean> => {
	const authService = inject(AuthService);
	const router = inject(Router);

	if (!authService.isAuthenticated()) {
		await router.navigate(['/signin']);
		return false;
	}

	const hasRole = await authService.hasRole(expectedRole);
	if (!hasRole) {
		await router.navigate(['/signin']);
		return false;
	}

	return true;
};

export const roleGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
	const expectedRole = String(route.data['role'] || 'employee');
	return checkRole(expectedRole);
};

export const requireRole = (role: 'admin' | 'employee'): CanActivateFn => {
	return async () => checkRole(role);
};
