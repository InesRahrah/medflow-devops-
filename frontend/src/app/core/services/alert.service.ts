import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, timer, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export interface Alert {
  id: number;
  title: string;
  message: string;
  type: 'warning' | 'error' | 'info';
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AlertService implements OnDestroy {

  private api = 'http://localhost:8086/api/alerts';
  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  public alerts$ = this.alertsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private pollSub?: Subscription;

  constructor(private http: HttpClient) {}

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // 🔥 LANCER LES ALERTES
  startPolling(userId: string): void {
    if (!userId) {
      console.warn('⚠️ AlertService: userId is empty, cannot start polling');
      return;
    }

    console.log('🔔 AlertService: Starting polling for userId:', userId);
    this.stopPolling();

    this.pollSub = timer(0, 5000).pipe(
      switchMap(() => this.getMyAlerts(userId))
    ).subscribe({
      next: (alerts: Alert[]) => {
        console.log("✅ ALERTS RECEIVED:", alerts.length, "alerts", alerts);
        this.alertsSubject.next(alerts);
        
        // Update unread count
        const unreadCount = alerts.filter((a: Alert) => !a.read).length;
        this.unreadCountSubject.next(unreadCount);
        console.log("📊 UNREAD COUNT:", unreadCount);
      },
      error: (err: any) => {
        console.error('❌ Error fetching alerts:', err);
      }
    });
  }

  stopPolling(): void {
    this.pollSub?.unsubscribe();
  }

  // 🔥 API
  getMyAlerts(userId: string): Observable<Alert[]> {
    // Try endpoint with userId header first
    const urlWithHeader = `${this.api}/my`;
    console.log(`📡 Attempt 1: Fetching from ${urlWithHeader} with userId header:`, userId);
    
    return this.http.get<Alert[]>(urlWithHeader, {
      headers: new HttpHeaders({
        userId: userId
      })
    }).pipe(
      map(res => {
        console.log('✅ Success with header method. Response:', res);
        return res || [];
      }),
      catchError((err1) => {
        console.warn('❌ Header method failed, trying query parameter method...');
        
        // Try with query parameter
        const urlWithQuery = `${this.api}?pharmacistId=${userId}`;
        console.log(`📡 Attempt 2: Fetching from ${urlWithQuery}`);
        
        return this.http.get<Alert[]>(urlWithQuery).pipe(
          map(res => {
            console.log('✅ Success with query method. Response:', res);
            return res || [];
          }),
          catchError((err2) => {
            console.warn('❌ Query method failed, trying without filter...');
            
            // Try all alerts
            console.log(`📡 Attempt 3: Fetching all alerts from ${this.api}`);
            return this.http.get<Alert[]>(this.api).pipe(
              map(res => {
                console.log('✅ Success with all alerts method. Response:', res);
                return res || [];
              }),
              catchError((err3) => {
                console.error('❌ All attempts failed:', {
                  error1: err1.message,
                  error2: err2.message,
                  error3: err3.message
                });
                return of([]);
              })
            );
          })
        );
      })
    );
  }

  markAsRead(alertId: number): Observable<any> {
    return this.http.put(`${this.api}/${alertId}/read`, {}).pipe(
      catchError(err => {
        console.error('❌ Error marking alert as read:', err);
        return of({});
      })
    );
  }

  deleteAlert(alertId: number): Observable<any> {
    return this.http.delete(`${this.api}/${alertId}`).pipe(
      catchError(err => {
        console.error('❌ Error deleting alert:', err);
        return of({});
      })
    );
  }
}