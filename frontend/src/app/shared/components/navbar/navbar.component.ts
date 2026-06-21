import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AlertService, Alert } from '../../../core/services/alert.service';
import { EnrichedNotification } from '../../../core/models/notification.model';
import { ROLE_CONFIG } from '../../../core/config/role-config';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  isScrolled = false;
  isMobileMenuOpen = false;
  isProfileMenuOpen = false;
  isLoggedIn = false;
  userName = 'User';
  userRole = 'PATIENT';
  userRoleLabel = 'Patient';
  isDarkMode = false;
  profilePictureUrl = '';

  // ── Notification state ────────────────────────────────────────────────────
  notifications: EnrichedNotification[] = [];
  alerts: Alert[] = [];
  unreadCount = 0;
  isNotificationsOpen = false;
  isNotificationsLoading = false;

  private closeProfileMenuTimeout?: number;
  private subs = new Subscription();
  showWizard = false;

  navLinks = [
    // stana navbar
    // { label: 'Services', route: '/services', roles: ['PATIENT'] },
    // { label: 'Departments', route: '/departments', roles: ['PATIENT'] },
    { label: 'Doctors', route: '/doctors', roles: ['PATIENT'] },
    {
      label: 'Appointments',
      route: '/patient/appointments',
      roles: ['PATIENT'],
    },
    {
      label: 'My Medical Record',
      route: '/patient/medical-record',
      roles: ['PATIENT'],
    },
  ];

  get filteredNavLinks() {
    return this.navLinks.filter((link) => {
      if (!link.roles) return true;
      return this.isLoggedIn && link.roles.includes(this.userRole);
    });
  }

  get hasUnread(): boolean {
    return this.unreadCount > 0;
  }

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

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  ngOnInit(): void {
    this.refreshAuthUi();

    if (
      this.authService.getToken() &&
      !this.authService.hasRoleInStoredProfile()
    ) {
      this.authService.getProfile().subscribe({
        next: () => this.refreshAuthUi(),
        error: () => {},
      });
    }

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

    this.subs.add(
      this.alertService.alerts$.subscribe((alerts) => {
        console.log('[NavbarComponent] Alerts updated:', alerts);
        this.alerts = alerts;
      }),
    );

   

    if (this.isLoggedIn) {
      this.startNotifications();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.notificationService.stopPolling();
    this.alertService.stopPolling();
  }

  // ── Notifications ─────────────────────────────────────────────────────────

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

  // ── Scroll / click ────────────────────────────────────────────────────────

  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled = window.scrollY > 50;
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

  // ── Auth UI ───────────────────────────────────────────────────────────────

  refreshAuthUi(): void {
    const token = this.authService.decodeToken();
    const localInfo = JSON.parse(localStorage.getItem('user_info') || '{}');

    this.profilePictureUrl =
      localInfo?.profilePictureUrl || token?.profilePictureUrl || '';
    this.isLoggedIn = !!this.authService.getToken() && !!token;
    const baseRole = this.authService.getUserRole().toUpperCase();
    const staffRole = (this.authService.getStaffRole() || '').toUpperCase();
    this.userRole = staffRole || baseRole;
    this.userRoleLabel = this.getRoleLabel(this.userRole);

    if (!this.isLoggedIn) {
      this.userName = 'User';
      this.userRoleLabel = 'Guest';
      this.unreadCount = 0;
      this.notifications = [];
      return;
    }

    const firstName = this.authService.getUserFirstName();
    const lastName = this.authService.getUserLastName();

    if (firstName) {
      this.userName = firstName;
    } else if (lastName) {
      this.userName = lastName;
    } else {
      const sub = token?.sub || localInfo?.email || localInfo?.username || '';
      if (sub) {
        const localPart = sub.includes('@') ? sub.split('@')[0] : sub;
        this.userName = this.capitalize(
          localPart.split(/[._-]/)[0] || localPart,
        );
      } else {
        this.userName = 'User';
      }
    }
  }

  private capitalize(value: string): string {
    if (!value) return 'User';
    const t = value.trim();
    if (!t) return 'User';
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }

  private getRoleLabel(role: string): string {
    const config = ROLE_CONFIG[role.toUpperCase()];
    return config ? config.label : 'User';
  }

  // ── Profile menu ──────────────────────────────────────────────────────────

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
    this.closeProfileMenu();
    const roleKey = this.userRole.toUpperCase();
    const config = ROLE_CONFIG[roleKey];
    
    if (config) {
        const profileRoutes: Record<string, string> = {
            'PATIENT': '/patient/profile',
            'DOCTOR': '/doctor/profile',
            'HOSPITAL': '/hospital/profile',
            'MANAGER': '/hospital/profile',
            'STAFF_ADMIN': '/hospital/profile',
            'NURSE': '/nurse/profile',
            'LABO': '/lab/profile',
            'ADMIN': '/admin/dashboard',
            'INSURANCE': '/insurance/dashboard',
            'PHARMACIST': '/pharmacist/profile',
            'DELIVERY_AGENT': '/delivery/profile',
            'CENTRAL_PHARMACY': '/central-pharmacy/profile'
        };
        
        const target = profileRoutes[roleKey] || config.baseRoute;
        this.router.navigate([target]);
    } else {
        this.router.navigate(['/']);
    }
  }

  logout(): void {
    this.notificationService.stopPolling();
    this.authService.logout();
    this.closeProfileMenu();
    this.isNotificationsOpen = false;
    this.notifications = [];
    this.unreadCount = 0;
    this.refreshAuthUi();
    this.router.navigate(['/login']);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMenu() {
    this.isMobileMenuOpen = false;
  }

  onLogoClick(event: Event): void {
    if (!this.isLoggedIn || this.userRole === 'PATIENT') {
      this.router.navigate(['/']);
    } else {
      event.preventDefault();
    }
  }

  // ── Alert methods ─────────────────────────────────────────────────────────

  getAlertIcon(type: string): string {
    switch (type) {
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      case 'info':
      default:
        return 'ⓘ';
    }
  }

  formatAlertTime(dateString: string): string {
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

  deleteAlert(alert: Alert, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.alertService.deleteAlert(alert.id).subscribe({
      next: () => {
        this.alerts = this.alerts.filter(a => a.id !== alert.id);
      },
      error: (err: any) => console.error('Error deleting alert:', err)
    });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private startNotifications(): void {
    const userId = this.authService.getUserId();
    console.log('🔔 NavbarComponent: userId from authService:', userId);
    console.log('🔔 NavbarComponent: userRole:', this.userRole);
    console.log('🔔 NavbarComponent: userName:', this.userName);
    
    if (!userId) {
      console.warn('⚠️ NavbarComponent: userId is empty or null!');
      return;
    }
    
    this.isNotificationsLoading = true;
    this.notificationService.startPolling(userId);
    this.alertService.startPolling(userId);
  }
}
