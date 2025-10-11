import { Routes } from '@angular/router';
import { Projects } from './features/projects/projects';
import { Settings } from './features/settings/settings';
import { Dashboard } from './features/dashboard/dashboard';

export const routes: Routes = [
    { path: 'dashboard', component: Dashboard },
    { path: 'projects', component: Projects },
    { path: 'settings', component: Settings },
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' }
];