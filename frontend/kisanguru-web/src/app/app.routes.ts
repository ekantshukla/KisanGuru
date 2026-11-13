import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home.component').then(m => m.HomeComponent) },
  { path: 'support', loadComponent: () => import('./pages/support.component').then(m => m.SupportComponent) },
  { path: 'khet', loadComponent: () => import('./pages/khet.component').then(m => m.KhetComponent) },
  { path: 'sahayak', loadComponent: () => import('./pages/sahayak.component').then(m => m.SahayakComponent) },
  { path: 'mausam', loadComponent: () => import('./pages/weather.component').then(m => m.WeatherComponent) },
  { path: 'mandi', loadComponent: () => import('./pages/mandi.component').then(m => m.MandiComponent) },
  { path: 'yojana', loadComponent: () => import('./pages/schemes.component').then(m => m.SchemesComponent) },
  { path: 'fasal', loadComponent: () => import('./pages/crops.component').then(m => m.CropsComponent) },
  { path: 'calculator', loadComponent: () => import('./pages/calculators.component').then(m => m.CalculatorsComponent) },
  { path: 'account', loadComponent: () => import('./pages/account.component').then(m => m.AccountComponent) },
  { path: 'madad', loadComponent: () => import('./pages/helplines.component').then(m => m.HelplinesComponent) },
  { path: '**', redirectTo: '' }
];
