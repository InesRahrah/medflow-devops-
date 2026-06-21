import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent {
  isSidebarCollapsed = false;
  adminName = 'System Admin';

  navLinks = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'fas fa-th-large' },
    { label: 'Users', route: '/admin/users', icon: 'fas fa-users' },
    { label: 'Staff', route: '/admin/staff', icon: 'fas fa-user-md' },
    { label: 'Departments', route: '/admin/departments', icon: 'fas fa-hospital' },
    { label: 'Hospitals', route: '/admin/hospitals', icon: 'fas fa-hospital' },
    { label: 'Appointments', route: '/admin/appointments', icon: 'fas fa-calendar-check' },
    { label: 'Insurance', route: '/admin/insurance', icon: 'fas fa-shield-alt' },
    { label: 'PCT (Suppliers)', route: '/admin/pct', icon: 'fas fa-truck-loading' },
    { label: 'Pharmacy Insights', route: '/admin/pharmacy', icon: 'fas fa-pills' },
    { label: 'Analytics', route: '/admin/analytics', icon: 'fas fa-chart-line' },
    { label: 'Settings', route: '/admin/settings', icon: 'fas fa-cog' }
  ];

  constructor(private authService: AuthService, private router: Router) {}

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }
}
