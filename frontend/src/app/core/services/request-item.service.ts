import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RequestItemService {

  private api = 'http://localhost:8086/api/request-items';

  constructor(private http: HttpClient) {}

  create(item: any) {
    return this.http.post(this.api, item);
  }

  getByRequestId(requestId: number) {
  return this.http.get<any[]>(`${this.api}/request/${requestId}`);
}
}