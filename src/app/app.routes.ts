// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { requireRole } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'signin', pathMatch: 'full' },
  {
    path: 'signin',
    loadChildren: () => import('./features/auth/auth.routes').then((module) => module.AUTH_ROUTES),
  },
  {
    path: 'dashboard/admin',
    canActivate: [authGuard, requireRole('admin')],
    loadChildren: () => import('./features/admin/admin.routes').then((module) => module.ADMIN_ROUTES),
  },
  {
    path: 'dashboard/employee',
    canActivate: [authGuard, requireRole('employee')],
    loadChildren: () => import('./features/employee/employee.routes').then((module) => module.EMPLOYEE_ROUTES),
  },
  { path: 'dashboard-admin', redirectTo: 'dashboard/admin', pathMatch: 'full' },
  { path: 'dashboard-employee', redirectTo: 'dashboard/employee', pathMatch: 'full' },
  { path: '**', redirectTo: 'signin' }
];