import { inject } from '@angular/core';
import { Router, type CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth-service/auth-service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const user = authService.getCurrentUser();
  
  if (!user) {
    router.navigate(['/signin'], { 
      queryParams: { returnUrl: router.url } 
    });
    return false;
  }
  
  // If no specific role is required for the route, just allow access
  const requiredRole = route.data['role'];
  if (!requiredRole) {
    return true;
  }
  
  // Check user role
  return new Promise<boolean>((resolve) => {
    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.warn('Role check timeout, defaulting to employee access');
      router.navigate(['/dashboard/employee']);
      resolve(false);
    }, 5000); // 5 second timeout
    
    authService.getCurrentUserRole().then((userRole) => {
      clearTimeout(timeout);
      if (userRole === requiredRole) {
        resolve(true);
      } else {
        // Redirect based on actual role
        if (userRole === 'admin') {
          router.navigate(['/dashboard/admin']);
        } else {
          router.navigate(['/dashboard/employee']);
        }
        resolve(false);
      }
    }).catch((error) => {
      clearTimeout(timeout);
      console.error('Error getting user role:', error);
      router.navigate(['/dashboard/employee']);
      resolve(false);
    });
  });
};