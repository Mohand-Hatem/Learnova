import { Routes } from '@angular/router';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/admin-layout/admin-layout').then((m) => m.AdminLayout),
    canActivate: [roleGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./components/dashboard/overview/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'admins',
        loadComponent: () =>
          import('./components/dashboard/admins/admins.component').then((m) => m.AdminsComponent),
      },
      {
        path: 'admins/:id',
        loadComponent: () =>
          import('./components/dashboard/admins/admin-detail/admin-detail.component').then(
            (m) => m.AdminDetailComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./components/dashboard/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./components/dashboard/users/user-detail/user-detail.component').then(
            (m) => m.UserDetailComponent,
          ),
      },
      {
        path: 'companies',
        loadComponent: () =>
          import('./components/dashboard/companies/companies.component').then(
            (m) => m.CompaniesComponent,
          ),
      },
      {
        path: 'companies/:id',
        loadComponent: () =>
          import('./components/dashboard/companies/company-detail/company-detail.components').then(
            (m) => m.CompanyDetailComponent,
          ),
      },
      {
        path: 'ai-monitoring',
        loadComponent: () =>
          import('./components/dashboard/ai-analysis/ai-analysis.component').then(
            (m) => m.AiAnalysisComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
