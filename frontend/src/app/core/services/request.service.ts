import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RequestService {

  private api = 'http://localhost:8086/api/requests';
  private deliveryApi = 'http://localhost:8086/api/deliveries';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // 🔐 COMMON HEADERS
  private getHeaders(customUserId?: string) {
    const userId = customUserId || this.authService.getUserId();

    return {
      headers: new HttpHeaders({
        userId: userId || ''
      })
    };
  }

  // =========================
  // 📦 REQUESTS
  // =========================

  create(request: any, userId?: string) {
    return this.http.post<any>(
      this.api,
      request,
      this.getHeaders(userId)
    );
  }

  getMyRequests() {
    return this.http.get<any[]>(`${this.api}/my`, this.getHeaders());
  }

  getAll() {
    return this.http.get<any[]>(this.api, this.getHeaders());
  }

  getByRegion(region: string) {
    return this.http.get<any[]>(
      `${this.api}/region/${region}`,
      this.getHeaders()
    );
  }

  // 🏢 CENTRAL
  getAllForCentral() {
    return this.http.get<any[]>(
      `${this.api}/central`,
      this.getHeaders()
    );
  }

  update(id: number, request: any) {
    return this.http.put(
      `${this.api}/${id}`,
      request,
      this.getHeaders()
    );
  }

  delete(id: number) {
    return this.http.delete(
      `${this.api}/${id}`,
      this.getHeaders()
    );
  }

  approve(id: number, deliveryAgentId?: number) {
    const url = deliveryAgentId
      ? `${this.api}/${id}/approve?deliveryAgentId=${deliveryAgentId}`
      : `${this.api}/${id}/approve`;

    return this.http.put(url, {}, this.getHeaders());
  }

  reject(id: number) {
    return this.http.put(
      `${this.api}/${id}/reject`,
      {},
      this.getHeaders()
    );
  }

  // =========================
  // 🚚 DELIVERY AGENTS
  // =========================

  getDeliveryAgents() {
    return this.http.get<any[]>(
      `${this.deliveryApi}/agents`,
      this.getHeaders()
    );
  }

  assignDelivery(requestId: number, payload: any) {
    return this.http.put(
      `${this.api}/${requestId}/assign-delivery`,
      payload,
      this.getHeaders()
    );
  }

  // =========================
  // 🚚 DELIVERY (AGENT SIDE)
  // =========================

  getMyDeliveries() {
    return this.http.get<any[]>(
      `${this.deliveryApi}/my`,
      this.getHeaders()
    );
  }

  acceptDelivery(id: number) {
    return this.http.put(
      `${this.deliveryApi}/${id}/accept`,
      {},
      this.getHeaders()
    );
  }

  completeDelivery(id: number) {
    return this.http.put(
      `${this.deliveryApi}/${id}/complete`,
      {},
      this.getHeaders()
    );
  }
}