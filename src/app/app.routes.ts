// app.routes.ts
import { Routes } from '@angular/router';
import { Signin } from './pages/signin/signin';
import { DashboardComponent } from './pages/dashboard/dashboard-new'; // Fixed import path
import { DashboardEmployeeComponent  } from './pages/dashboard/employee-dashboard';

export const routes: Routes = [
  { path: '', redirectTo: 'signin', pathMatch: 'full' },
  { path: 'signin', component: Signin },
  { path: 'dashboard/admin', component: DashboardComponent },
  { path: 'dashboard/employee', component: DashboardEmployeeComponent  },
  { path: '**', redirectTo: 'signin' }
];