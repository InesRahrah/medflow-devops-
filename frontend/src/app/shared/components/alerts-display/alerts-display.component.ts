import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertService, Alert } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-alerts-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alerts-display.component.html',
  styleUrls: ['./alerts-display.component.css']
})
export class AlertsDisplayComponent implements OnInit, OnDestroy {
  alerts: Alert[] = [];
  unreadCount = 0;
  showDropdown = false;

  private alertsSubscription?: Subscription;
  private unreadCountSubscription?: Subscription;
  private userId: string = '';

  constructor(
    private alertService: AlertService,
    private authService: AuthService,
    private elementRef: ElementRef
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  ngOnInit(): void {
    this.userId = this.authService.getUserId() || '';
    
    if (this.userId) {
      // Start polling for alerts
      this.alertService.startPolling(this.userId);
      
      // Subscribe to alerts changes
      this.alertsSubscription = this.alertService.alerts$.subscribe(alerts => {
        this.alerts = alerts;
      });

      // Subscribe to unread count
      this.unreadCountSubscription = this.alertService.unreadCount$.subscribe((count: number) => {
        this.unreadCount = count;
      });
    }
  }

  ngOnDestroy(): void {
    this.alertService.stopPolling();
    this.alertsSubscription?.unsubscribe();
    this.unreadCountSubscription?.unsubscribe();
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  closeDropdown(): void {
    this.showDropdown = false;
  }

  markAsRead(alert: Alert, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!alert.read) {
      this.alertService.markAsRead(alert.id).subscribe({
        next: () => {
          // Refresh alerts from the service
          if (this.userId) {
            this.alertService.getMyAlerts(this.userId).subscribe(alerts => {
              this.alerts = alerts;
              // Manually update unreadCount
              this.unreadCount = alerts.filter(a => !a.read).length;
            });
          }
        },
        error: (err: any) => console.error('Error marking alert as read:', err)
      });
    }
  }

  deleteAlert(alert: Alert, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    this.alertService.deleteAlert(alert.id).subscribe({
      next: () => {
        // Remove from local list
        this.alerts = this.alerts.filter(a => a.id !== alert.id);
        // Update unreadCount
        this.unreadCount = this.alerts.filter(a => !a.read).length;
      },
      error: (err: any) => console.error('Error deleting alert:', err)
    });
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      case 'info':
      default:
        return 'ⓘ';
    }
  }

  getAlertClass(type: string): string {
    return `alert-${type}`;
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  get hasAlerts(): boolean {
    return this.alerts.length > 0;
  }
}
