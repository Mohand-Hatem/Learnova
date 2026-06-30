import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/admin`;

  getAllCompanies() {
    return this.http.get<any>(`${this.api}/all`, { withCredentials: true });
  }

  registerCompanyAccount(payload: {
    name: { en: string; ar: string };
    email: string;
    password: string;
    role: 'admin' | 'user' | 'company';
    skipLogin?: boolean;
  }) {
    return this.http.post<any>(
      `${environment.apiUrl}/auth/register`,
      payload,
      { withCredentials: true },
    );
  }

  getCompanyById(id: string) {
    return this.http.get<any>(`${this.api}/${id}`, { withCredentials: true });
  }

  deleteCompany(id: string) {
    return this.http.delete<any>(`${this.api}/user/${id}`, { withCredentials: true });
  }

  updateCompanyPlan(id: string, plan: string) {
    return this.http.put<any>(
      `${this.api}/user/${id}/plan`,
      { plan },
      { withCredentials: true },
    );
  }

  toggleBan(id: string) {
    return this.http.put<{ success: boolean; data: any }>(
      `${this.api}/${id}/ban`,
      {},
      { withCredentials: true },
    );
  }

}
