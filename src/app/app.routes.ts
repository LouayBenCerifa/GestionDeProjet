import { Routes } from '@angular/router';
import { Signin } from './pages/signin/signin';
import { Registre } from './pages/registre/registre';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { authGuard } from './guard/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'signin', pathMatch: 'full' },
  { path: 'signin', component: Signin },
  { path: 'registre', component: Registre },
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [authGuard] 
  },
  { path: '**', redirectTo: 'signin' } // Fallback route
];