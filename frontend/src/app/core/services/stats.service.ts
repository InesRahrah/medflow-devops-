import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StatsService {

  private api = 'http://localhost:8086/api/stats';

  constructor(private http: HttpClient) {}

  getStock() {
    return this.http.get<any[]>(`${this.api}/stock`);
  }

  getCritical() {
    return this.http.get<any[]>(`${this.api}/critical`);
  }
}