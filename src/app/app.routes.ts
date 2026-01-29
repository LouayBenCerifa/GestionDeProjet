import { Routes } from '@angular/router';
import { Signin } from './pages/signin/signin';
import { Registre } from './pages/registre/registre';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { DashboardAdminComponent } from './pages/dashboard/dashboard-admin.component';
import { DashboardEmployeeComponent } from './pages/dashboard/dashboard-employee.component';
import { authGuard } from './guard/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'signin', pathMatch: 'full' },
  { path: 'signin', component: Signin },
  { path: 'registre', component: Registre },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'dashboard/admin', component: DashboardAdminComponent, canActivate: [authGuard] },
  { path: 'dashboard/employee', component: DashboardEmployeeComponent, canActivate: [authGuard] },
  // Add more routes for main features if needed
  { path: '**', redirectTo: 'signin' } // Fallback route
];