import { Routes } from '@angular/router';
import { LoginPageComponent } from './components/login/login.component';
import { RegisterPageComponent } from './components/register/register.component';

export const AUTH_ROUTES: Routes = [
	{ path: '', component: LoginPageComponent },
	{ path: 'register', component: RegisterPageComponent }
];
