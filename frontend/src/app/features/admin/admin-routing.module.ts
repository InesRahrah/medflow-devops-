import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { AdminStaffComponent } from './admin-staff/admin-staff.component';
import { AdminDepartmentsComponent } from './admin-departments/admin-departments.component';
import { AdminAnalyticsComponent } from './admin-analytics/admin-analytics.component';
import { AdminSettingsComponent } from './admin-settings/admin-settings.component';
import { AdminLogsComponent } from './admin-logs/admin-logs.component';
import { AdminBlogFormComponent } from '../blogs/components/admin-blog-form/admin-blog-form.component';

import { AdminHospitalsComponent } from './placeholders/admin-hospitals.component';
import { AdminAppointmentsComponent } from './placeholders/admin-appointments.component';
import { AdminInsuranceComponent } from './placeholders/admin-insurance.component';
import { AdminPctComponent } from './placeholders/admin-pct.component';
import { AdminPharmacyComponent } from './placeholders/admin-pharmacy.component';

const routes: Routes = [
  { path: 'login', component: AdminLoginComponent },
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: 'dashboard',    component: AdminDashboardComponent },
      { path: 'users',        component: AdminUsersComponent },
      { path: 'staff',        component: AdminStaffComponent },
      { path: 'departments',  component: AdminDepartmentsComponent },
      { path: 'hospitals',    component: AdminHospitalsComponent },
      { path: 'appointments', component: AdminAppointmentsComponent },
      { path: 'insurance',    component: AdminInsuranceComponent },
      { path: 'pct',          component: AdminPctComponent },
      { path: 'pharmacy',     component: AdminPharmacyComponent },
      { path: 'analytics',    component: AdminAnalyticsComponent },
      { path: 'settings',     component: AdminSettingsComponent },
      { path: 'logs',         component: AdminLogsComponent },
      { path: 'blogs',        component: AdminBlogFormComponent }, // ✅ FIXED
      { path: '',             redirectTo: 'dashboard', pathMatch: 'full' },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
