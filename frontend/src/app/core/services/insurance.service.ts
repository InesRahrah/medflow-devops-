import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Claim {
  id?: number;
  patientId: string;
  doctorId: string;
  consultationId?: number;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  insuranceCompany: string;
  description: string;
  amount: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  rejectionReason?: string;
  paymentDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class InsuranceService {
  private api = '/api/v1/insurance'; // corrigé

  constructor(private http: HttpClient) {}

  createClaim(claim: Claim): Observable<Claim> {
    return this.http.post<Claim>(`${this.api}/claims`, claim);
  }

  getAllClaims(): Observable<Claim[]> {
    return this.http.get<Claim[]>(`${this.api}/claims`);
  }

  getClaimById(id: number): Observable<Claim> {
    return this.http.get<Claim>(`${this.api}/claims/${id}`);
  }

  getClaimsByPatient(patientId: string): Observable<Claim[]> {
    return this.http.get<Claim[]>(`${this.api}/claims/patient/${patientId}`);
  }

  getClaimsByDoctor(doctorId: string): Observable<Claim[]> {
    return this.http.get<Claim[]>(`${this.api}/claims/doctor/${doctorId}`);
  }

  getClaimsByStatus(status: string): Observable<Claim[]> {
    return this.http.get<Claim[]>(`${this.api}/claims/status/${status}`);
  }

  updateClaim(id: number, claim: Claim): Observable<Claim> {
    return this.http.put<Claim>(`${this.api}/claims/${id}`, claim);
  }

  updateStatus(id: number, status: string, rejectionReason?: string): Observable<Claim> {
    return this.http.patch<Claim>(`${this.api}/claims/${id}/status`,
      { status, rejectionReason });
  }

  deleteClaim(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/claims/${id}`);
  }
}