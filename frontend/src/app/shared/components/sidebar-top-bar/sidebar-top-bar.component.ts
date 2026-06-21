import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AlertService } from '../../../core/services/alert.service';
import { EnrichedNotification } from '../../../core/models/notification.model';

@Component({
  selector: 'app-sidebar-top-bar',
  templateUrl: './sidebar-top-bar.component.html',
  styleUrl: './sidebar-top-bar.component.css',
  standalone: false,
})
export class SidebarTopBarComponent implements OnInit, OnDestroy {
  alertCount: number = 0;
  alerts: any[] = [];
  userName: string = 'User';
  userRole: string = 'PATIENT';
  profileRoleLabel: string = 'Patient';
  roleLabel: string = 'Patient Portal';
  userInitial: string = 'U';
  profilePictureUrl: string = '';
  isProfileMenuOpen = false;
  isDarkMode = false;
  notifications: EnrichedNotification[] = [];
  unreadCount = 0;
  isNotificationsOpen = false;
  isNotificationsLoading = false;
  private closeProfileMenuTimeout?: number;
  private subs = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService,
    private notificationService: NotificationService,
    private alertService: AlertService,
  ) {
    this.themeService.isDarkTheme$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });
  }

  ngOnInit(): void {
    this.refreshUi();

    this.subs.add(
      this.authService.userInfo$.subscribe(() => {
        this.refreshUi();
      }),
    );

    this.subs.add(
      this.notificationService.enrichedNotifications$.subscribe((items) => {
        this.notifications = items;
        this.isNotificationsLoading = false;
      }),
    );

    this.subs.add(
      this.notificationService.unreadCount$.subscribe((count) => {
        this.unreadCount = count;
      }),
    );

    // Subscribe to AlertService for pharmacist alerts
    this.subs.add(
      this.alertService.alerts$.subscribe((alerts) => {
        console.log('🔔 [SidebarTopBar] Alerts updated:', alerts);
        this.alerts = alerts;
        this.alertCount = alerts.filter(a => !a.read).length;
      }),
    );

    this.subs.add(
      this.alertService.unreadCount$.subscribe((count) => {
        console.log('🔔 [SidebarTopBar] Alert unread count:', count);
        this.alertCount = count;
      }),
    );

    const userId = this.authService.getUserId();
    if (userId) {
      this.isNotificationsLoading = true;
      this.notificationService.startPolling(userId);
      this.alertService.startPolling(userId);
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.notificationService.stopPolling();
    this.alertService.stopPolling();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get hasUnread(): boolean {
    return this.unreadCount > 0;
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.isNotificationsOpen = !this.isNotificationsOpen;
  }

  closeNotifications(): void {
    this.isNotificationsOpen = false;
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  onMarkRead(notificationId: number): void {
    this.notificationService.markAsRead(notificationId);
  }

  onActionDone(_notificationId: number): void {
    window.setTimeout(() => this.notificationService.refreshNow(), 2000);
  }

  trackById(_: number, item: EnrichedNotification): number {
    return item.id;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-menu-wrap')) {
      this.clearCloseProfileTimer();
      this.isProfileMenuOpen = false;
    }
    if (!target.closest('.notif-wrap')) {
      this.isNotificationsOpen = false;
    }
  }

  refreshUi(): void {
    const token = this.authService.decodeToken();
    if (!token) return;

    const baseRole = this.authService.getUserRole().toUpperCase();
    const staffRole = (this.authService.getStaffRole() || '').toUpperCase();
    this.userRole =
      staffRole === 'DOCTOR' ||
      staffRole === 'NURSE' ||
      staffRole === 'STAFF_ADMIN'
        ? staffRole
        : baseRole;
    this.roleLabel = this.getRoleLabel(this.userRole);
    this.profileRoleLabel = this.getProfileRoleLabel(this.userRole);

    const localInfo = this.authService.getStoredUserInfo();
    this.profilePictureUrl =
      localInfo?.profilePictureUrl || token?.profilePictureUrl || '';

    // Try to get firstName from multiple sources
    let firstName = this.authService.getUserFirstName();
    
    // If not found, check localStorage
    if (!firstName) {
      firstName = localInfo?.firstName || localInfo?.firstname || localInfo?.user?.firstName || localInfo?.user?.firstname || '';
    }
    
    const lastName = this.authService.getUserLastName();

    if (firstName) {
      this.userName = firstName;
      this.userInitial = firstName.charAt(0).toUpperCase();
    } else if (lastName) {
      this.userName = lastName;
      this.userInitial = lastName.charAt(0).toUpperCase();
    } else {
      const fallbackIdentity =
        token.sub || localInfo?.email || localInfo?.user?.email || '';
      if (fallbackIdentity && fallbackIdentity.includes('@')) {
        const localPart = fallbackIdentity.split('@')[0].split(/[._-]/)[0];
        this.userName =
          localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase();
        this.userInitial = this.userName.charAt(0).toUpperCase();
      } else {
        this.userName = 'User';
        this.userInitial = 'U';
      }
    }
  }

  private getRoleLabel(role: string): string {
    switch (role) {
      case 'PATIENT':
        return 'Patient Workspace';
      case 'DOCTOR':
        return 'Doctor Workspace';
      case 'NURSE':
        return 'Nurse Panel';
      case 'STAFF_ADMIN':
        return 'Hospital Workspace';
      case 'HOSPITAL':
      case 'MANAGER':
        return 'Hospital Workspace';
      case 'LABO':
        return 'Lab Workspace';
      case 'ADMIN':
        return 'Admin Workspace';
      case 'INSURANCE':
        return 'Insurance Workspace';
      case 'PHARMACIST':
        return 'Central Pharmacy';
      case 'DELIVERY_AGENT':
        return 'Delivery Agent Workspace';
      default:
        return 'User Portal';
    }
  }

  private getProfileRoleLabel(role: string): string {
    switch (role) {
      case 'PATIENT':
        return 'Patient';
      case 'DOCTOR':
        return 'Doctor';
      case 'NURSE':
        return 'Nurse';
      case 'STAFF_ADMIN':
        return 'Hospital Admin';
      case 'HOSPITAL':
      case 'MANAGER':
        return 'Hospital Manager';
      case 'LABO':
        return 'Lab Specialist';
      case 'ADMIN':
        return 'Administrator';
      case 'INSURANCE':
        return 'Insurance Officer';
      case 'PHARMACIST':
        return 'Pharmacist';
      case 'DELIVERY_AGENT':
        return 'Delivery Agent';
      default:
        return 'User';
    }
  }

  toggleProfileMenu(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.clearCloseProfileTimer();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  openProfileMenu(): void {
    this.clearCloseProfileTimer();
    this.isProfileMenuOpen = true;
  }

  closeProfileMenu(): void {
    this.clearCloseProfileTimer();
    this.closeProfileMenuTimeout = window.setTimeout(() => {
      this.isProfileMenuOpen = false;
    }, 150);
  }

  private clearCloseProfileTimer(): void {
    if (this.closeProfileMenuTimeout) {
      clearTimeout(this.closeProfileMenuTimeout);
      this.closeProfileMenuTimeout = undefined;
    }
  }

  goToProfile(): void {
    this.isProfileMenuOpen = false;
    switch (this.userRole) {
      case 'DOCTOR':
        this.router.navigate(['/doctor/profile']);
        break;
      case 'NURSE':
        this.router.navigate(['/nurse/dashboard']);
        break;
      case 'STAFF_ADMIN':
        this.router.navigate(['/hospital/profile']);
        break;
      case 'HOSPITAL':
      case 'MANAGER':
        this.router.navigate(['/hospital/profile']);
        break;
      case 'LABO':
        this.router.navigate(['/lab/profile']);
        break;
      case 'INSURANCE':
        this.router.navigate(['/insurance/profile']);
        break;
      case 'PHARMACIST':
        this.router.navigate(['/pharmacist/profile']);
        break;
      case 'DELIVERY_AGENT':
        this.router.navigate(['/delivery/profile']);
        break;

      default:
        this.router.navigate(['/patient/profile']);
        break;
    }
  }

  logout(): void {
    this.isProfileMenuOpen = false;
    this.notificationService.stopPolling();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ─── ALERT ACTIONS ────────────────────────────────────────────────────────
  onMarkAlertRead(alert: any): void {
    this.alertService.markAsRead(alert.id).subscribe({
      next: () => {
        console.log('✅ Alert marked as read:', alert.id);
      },
      error: (err) => {
        console.error('❌ Error marking alert as read:', err);
      }
    });
  }

  onDeleteAlert(alert: any): void {
    this.alertService.deleteAlert(alert.id).subscribe({
      next: () => {
        console.log('🗑️ Alert deleted:', alert.id);
      },
      error: (err) => {
        console.error('❌ Error deleting alert:', err);
      }
    });
  }
}
