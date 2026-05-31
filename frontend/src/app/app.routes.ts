import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { roleGuard } from './guards/role.guard';
import { OverviewComponent } from './components/dashboard/overview/overview.component';
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
    component: DashboardComponent,
    canActivate: [roleGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: OverviewComponent },
      { path: 'users', component: UsersComponent },
      { path: 'users/:id', component: UserDetailComponent },
      { path: 'companies', component: CompaniesComponent },
      { path: 'analysis', component: AiAnalysisComponent },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
