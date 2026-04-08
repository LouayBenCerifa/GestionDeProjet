import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
	return next(req).pipe(
		catchError((error: unknown) => {
			if (error instanceof HttpErrorResponse) {
				const message = error.error?.message || error.message || 'Unexpected server error.';
				return throwError(() => new Error(message));
			}

			return throwError(() => new Error('Unexpected client error.'));
		})
	);
};
