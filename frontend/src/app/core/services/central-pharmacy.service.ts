import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export interface CentralPharmacyRequest {
  id: string;
  pharmacistId: string;
  pharmacistName: string;
  pharmacyName: string;
  requestType: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  details?: any;
}

export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  pharmacistCount: number;
}

export interface CentralPharmacyProfile {
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  registrationNumber: string;
  city: string;
  country: string;
  zipCode: string;
  description?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CentralPharmacyService {
  private readonly apiBaseUrl = '/api/v1/central-pharmacy';
  private requestsSubject = new BehaviorSubject<CentralPharmacyRequest[]>([]);
  public requests$ = this.requestsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Get all pharmacy requests with optional filtering
  getAllPharmacyRequests(
    status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ): Observable<CentralPharmacyRequest[]> {
    let url = `${this.apiBaseUrl}/requests`;
    if (status) {
      url += `?status=${status}`;
    }
    return this.http.get<CentralPharmacyRequest[]>(url).pipe(
      tap((requests) => this.requestsSubject.next(requests)),
      catchError(this.handleError),
    );
  }

  // Get dashboard statistics
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiBaseUrl}/dashboard/stats`).pipe(
      catchError(this.handleError),
    );
  }

  // Get recent requests
  getRecentRequests(limit: number = 5): Observable<CentralPharmacyRequest[]> {
    return this.http
      .get<CentralPharmacyRequest[]>(`${this.apiBaseUrl}/requests/recent?limit=${limit}`)
      .pipe(catchError(this.handleError));
  }

  // Get a single request by ID
  getRequestById(requestId: string): Observable<CentralPharmacyRequest> {
    return this.http
      .get<CentralPharmacyRequest>(`${this.apiBaseUrl}/requests/${requestId}`)
      .pipe(catchError(this.handleError));
  }

  // Approve a pharmacy request
  approveRequest(requestId: string): Observable<any> {
    return this.http
      .post(`${this.apiBaseUrl}/requests/${requestId}/approve`, {})
      .pipe(
        tap(() => this.refreshRequests()),
        catchError(this.handleError),
      );
  }

  // Reject a pharmacy request with reason
  rejectRequest(requestId: string, reason: string): Observable<any> {
    return this.http
      .post(`${this.apiBaseUrl}/requests/${requestId}/reject`, { reason })
      .pipe(
        tap(() => this.refreshRequests()),
        catchError(this.handleError),
      );
  }

  // Update central pharmacy profile
  updateCentralPharmacyProfile(profile: CentralPharmacyProfile): Observable<any> {
    return this.http
      .put(`${this.apiBaseUrl}/profile`, profile)
      .pipe(catchError(this.handleError));
  }

  // Get central pharmacy profile
  getCentralPharmacyProfile(): Observable<CentralPharmacyProfile> {
    return this.http
      .get<CentralPharmacyProfile>(`${this.apiBaseUrl}/profile`)
      .pipe(catchError(this.handleError));
  }

  // Refresh requests from server
  private refreshRequests(): void {
    this.getAllPharmacyRequests().subscribe({
      error: (error) => console.error('Error refreshing requests:', error),
    });
  }

  // Handle errors
  private handleError(error: any) {
    console.error('API Error:', error);
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else if (error.status) {
      // Server-side error
      errorMessage = error.error?.message || `Error Code: ${error.status}`;
    }

    return throwError(() => new Error(errorMessage));
  }
}
