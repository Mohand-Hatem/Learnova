import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/admin`;

  getAllUsers() {
    return this.http.get<any>(`${this.api}/all`, { withCredentials: true });
  }

  getUserById(id: string) {
    return this.http.get<any>(`${this.api}/${id}`, { withCredentials: true });
  }

  deleteUser(id: string) {
    return this.http.delete<any>(`${this.api}/user/${id}`, { withCredentials: true });
  }

  updatePlan(id: string, plan: string) {
    return this.http.put<any>(`${this.api}/user/${id}/plan`, { plan }, { withCredentials: true });
  }

  toggleBan(id: string) {
    return this.http.put<{ success: boolean; data: any }>(
      `${this.api}/${id}/ban`,
      {},
      { withCredentials: true },
    );
  }
}
