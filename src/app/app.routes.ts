import { Routes } from '@angular/router';
import { Signin } from './pages/signin/signin';
import { Registre } from './pages/registre/registre';
export const routes: Routes = [
    {path: '', component: Signin},
    {path: 'registre', component: Registre}
];
