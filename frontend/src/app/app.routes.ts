import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AdminLayout } from './components/dashboard/admin-layout/admin-layout';
import { roleGuard } from './guards/role.guard';
import { Dashboard as OverviewComponent } from './components/dashboard/overview/dashboard';
import { UsersComponent } from './components/dashboard/users/users.component';
import { CompaniesComponent } from './components/dashboard/companies/companies.component';
import { AiAnalysisComponent } from './components/dashboard/ai-analysis/ai-analysis.component';
import { UserDetailComponent } from './components/dashboard/users/user-detail/user-detail.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'dashboard',
    component: AdminLayout,
    canActivate: [roleGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: OverviewComponent },
      { path: 'users', component: UsersComponent },
       { path: 'users/:id', component: UserDetailComponent },
      { path: 'companies', component: CompaniesComponent },
      { path: 'ai-monitoring', component: AiAnalysisComponent },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
