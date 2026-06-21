import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StockService {

  private api = 'http://localhost:8086/api/stock';

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<any[]>(this.api);
  }

  getLowStock() {
    return this.http.get<any[]>(`${this.api}/low`);
  }

  /**
   * Get stock items with expiration dates
   */
  getExpiringStock() {
    return this.http.get<any[]>(`${this.api}/expiring`);
  }

  /**
   * Get stock expiration alerts
   */
  getExpirationAlerts(userId: string) {
    return this.http.get<any[]>(`${this.api}/expiration-alerts`, {
      headers: new HttpHeaders({
        userId: userId || ''
      })
    });
  }

  /**
   * Get items expiring soon (within X days)
   */
  getItemsExpiringWithinDays(days: number = 30, userId?: string) {
    const headers = userId ? new HttpHeaders({ userId }) : undefined;
    return this.http.get<any[]>(`${this.api}/expiring-within/${days}`, { headers });
  }

  /**
   * Update a stock item
   */
  update(id: string, stock: any) {
    return this.http.put<any>(`${this.api}/${id}`, stock);
  }
}