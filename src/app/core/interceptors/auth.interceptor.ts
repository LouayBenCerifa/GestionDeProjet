import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../../services/auth-service/auth-service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
	const authService = inject(AuthService);
	const userId = authService.getUserId();
	const userEmail = authService.getUserEmail();

	const headers: Record<string, string> = {
		'X-App-Client': 'GestionDeProjet'
	};

	if (userId) {
		headers['X-User-Id'] = userId;
	}

	if (userEmail) {
		headers['X-User-Email'] = userEmail;
	}

	return next(req.clone({ setHeaders: headers }));
};
