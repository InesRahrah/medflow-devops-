import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AlertService, Alert } from '../../../core/services/alert.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="notification-container" #dropdownPanel>
  <!-- Bell Icon Button -->
  <button class="bell-button" (click)="toggleDropdown($event)" [attr.aria-label]="'Notifications'">
    <svg class="bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
    
    <!-- Unread Count Badge -->
    <div class="badge" *ngIf="(unreadCount$ | async) as count" [class.hidden]="count === 0">
      {{ count > 99 ? '99+' : count }}
    </div>
  </button>

  <!-- Dropdown Panel -->
  <div class="dropdown-panel" [class.open]="isDropdownOpen">
    <div class="dropdown-header">
      <h3>Notifications</h3>
      <button class="close-btn" (click)="isDropdownOpen = false" aria-label="Close notifications">
        ×
      </button>
    </div>

    <div class="alerts-container">
      <!-- Alerts List -->
      <div class="alerts-list" *ngIf="(alerts$ | async) as alerts">
        <ng-container *ngIf="alerts.length > 0; else noAlerts">
          <div
            class="alert-item"
            *ngFor="let alert of alerts"
            [class.unread]="!alert.read"
            [class.read]="alert.read"
            (click)="markAsRead(alert, $event)"
          >
            <!-- Alert Content -->
            <div class="alert-content">
              <div class="alert-header">
                <span class="alert-type" [ngClass]="getAlertTypeClass(alert.type)">
                  {{ alert.type | uppercase }}
                </span>
                <span class="alert-time">{{ formatDate(alert.createdAt) }}</span>
              </div>
              <h4 class="alert-title">{{ alert.title }}</h4>
              <p class="alert-message">{{ alert.message }}</p>
            </div>

            <!-- Alert Actions -->
            <div class="alert-actions">
              <button
                class="action-btn mark-read-btn"
                *ngIf="!alert.read"
                (click)="markAsRead(alert, $event)"
                title="Mark as read"
                aria-label="Mark as read"
              >
                ✓
              </button>
              <button
                class="action-btn delete-btn"
                (click)="deleteAlert(alert.id, $event)"
                title="Delete alert"
                aria-label="Delete alert"
              >
                🗑️
              </button>
            </div>

            <!-- Unread Indicator Dot -->
            <div class="unread-indicator" *ngIf="!alert.read"></div>
          </div>
        </ng-container>

        <!-- No Alerts State -->
        <ng-template #noAlerts>
          <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <p>No notifications</p>
          </div>
        </ng-template>
      </div>
    </div>
  </div>
</div>`,
  styles: [`
    .notification-container {
      position: relative;
      display: inline-block;
    }
    .bell-button {
      position: relative;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px 12px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      color: #666;
      font-size: 24px;
    }
    .bell-button:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: #333;
    }
    .bell-button:active {
      transform: scale(0.95);
    }
    .bell-icon {
      width: 24px;
      height: 24px;
      stroke: currentColor;
      fill: none;
    }
    .badge {
      position: absolute;
      top: 0;
      right: 0;
      background: linear-gradient(135deg, #ff4757, #ee5a6f);
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(255, 71, 87, 0.3);
      animation: badgePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    .badge.hidden {
      display: none;
    }
    @keyframes badgePulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    .dropdown-panel {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06);
      width: 380px;
      max-height: 500px;
      display: flex;
      flex-direction: column;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px) scale(0.95);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
      z-index: 1000;
    }
    .dropdown-panel.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    .dropdown-header {
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .dropdown-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #999;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }
    .close-btn:hover {
      color: #333;
    }
    .alerts-container {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
    }
    .alerts-container::-webkit-scrollbar {
      width: 6px;
    }
    .alerts-container::-webkit-scrollbar-track {
      background: transparent;
    }
    .alerts-container::-webkit-scrollbar-thumb {
      background: #ddd;
      border-radius: 3px;
    }
    .alerts-list {
      display: flex;
      flex-direction: column;
    }
    .alert-item {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid #f5f5f5;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      background-color: white;
    }
    .alert-item:last-child {
      border-bottom: none;
    }
    .alert-item:hover {
      background-color: #fafafa;
    }
    .alert-item.unread {
      background-color: #f9f9ff;
      border-left: 3px solid #3498db;
      padding-left: 13px;
    }
    .alert-item.unread:hover {
      background-color: #f3f7ff;
    }
    .alert-item.read {
      opacity: 0.7;
    }
    .alert-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .alert-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .alert-type {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .alert-type.alert-warning {
      background-color: #fff3cd;
      color: #856404;
    }
    .alert-type.alert-error {
      background-color: #f8d7da;
      color: #721c24;
    }
    .alert-type.alert-info {
      background-color: #d1ecf1;
      color: #0c5460;
    }
    .alert-time {
      color: #999;
      font-size: 11px;
      margin-left: auto;
      white-space: nowrap;
    }
    .alert-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .alert-message {
      margin: 0;
      font-size: 13px;
      color: #666;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .alert-actions {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .action-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      padding: 4px 6px;
      border-radius: 4px;
      transition: all 0.2s ease;
      opacity: 0;
      animation: slideIn 0.3s ease forwards;
    }
    .alert-item:hover .action-btn {
      opacity: 1;
    }
    .action-btn:hover {
      background-color: rgba(0, 0, 0, 0.05);
      transform: scale(1.15);
    }
    .action-btn:active {
      transform: scale(0.95);
    }
    .mark-read-btn {
      color: #3498db;
    }
    .delete-btn {
      color: #e74c3c;
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(8px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    .unread-indicator {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 8px;
      height: 8px;
      background-color: #3498db;
      border-radius: 50%;
      animation: indicatorPulse 2s ease-in-out infinite;
    }
    @keyframes indicatorPulse {
      0%, 100% {
        opacity: 1;
        transform: translateY(-50%) scale(1);
      }
      50% {
        opacity: 0.6;
        transform: translateY(-50%) scale(1.3);
      }
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
      text-align: center;
      color: #999;
    }
    .empty-icon {
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
      opacity: 0.3;
      stroke: currentColor;
      fill: none;
    }
    .empty-state p {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
    }
    @media (max-width: 600px) {
      .dropdown-panel {
        width: calc(100vw - 32px);
        right: auto;
        left: 16px;
      }
    }
    @media (max-width: 480px) {
      .bell-button {
        padding: 6px 8px;
      }
      .alert-item {
        flex-direction: column;
        gap: 8px;
      }
      .alert-actions {
        width: 100%;
        justify-content: flex-end;
      }
      .alert-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .alert-time {
        margin-left: 0;
      }
    }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  @ViewChild('dropdownPanel') dropdownPanel?: ElementRef;

  alerts$!: Observable<Alert[]>;
  unreadCount$!: Observable<number>;
  
  isDropdownOpen = false;
  private destroy$ = new Subject<void>();

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {
    this.alerts$ = this.alertService.alerts$;
    this.unreadCount$ = this.alertService.unreadCount$;
    
    // Debug logging
    this.alerts$.pipe(takeUntil(this.destroy$)).subscribe(alerts => {
      console.log('🔔 NotificationBellComponent: alerts updated:', alerts);
    });
    
    this.unreadCount$.pipe(takeUntil(this.destroy$)).subscribe(count => {
      console.log('🔔 NotificationBellComponent: unreadCount updated:', count);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Toggle dropdown open/close
  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  closeDropdownOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (this.dropdownPanel && !this.dropdownPanel.nativeElement.contains(target)) {
      this.isDropdownOpen = false;
    }
  }

  // Mark alert as read
  markAsRead(alert: Alert, event: Event): void {
    event.stopPropagation();
    
    if (!alert.read) {
      this.alertService.markAsRead(alert.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Alert marked as read:', alert.id);
          },
          error: (err) => {
            console.error('❌ Error marking alert as read:', err);
          }
        });
    }
  }

  // Delete alert
  deleteAlert(alertId: number, event: Event): void {
    event.stopPropagation();
    
    this.alertService.deleteAlert(alertId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('🗑️ Alert deleted:', alertId);
        },
        error: (err) => {
          console.error('❌ Error deleting alert:', err);
        }
      });
  }

  // Format date for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  // Get alert type class for styling
  getAlertTypeClass(type: string): string {
    return `alert-${type}`;
  }
}
