import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';

import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { AdminStaffComponent } from './admin-staff/admin-staff.component';
import { AdminDepartmentsComponent } from './admin-departments/admin-departments.component';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { AdminAnalyticsComponent } from './admin-analytics/admin-analytics.component';
import { AdminSettingsComponent } from './admin-settings/admin-settings.component';
import { AdminLogsComponent } from './admin-logs/admin-logs.component';

import { AdminHospitalsComponent } from './placeholders/admin-hospitals.component';
import { AdminAppointmentsComponent } from './placeholders/admin-appointments.component';
import { AdminInsuranceComponent } from './placeholders/admin-insurance.component';
import { AdminPctComponent } from './placeholders/admin-pct.component';
import { AdminPharmacyComponent } from './placeholders/admin-pharmacy.component';

@NgModule({
  declarations: [
    AdminDashboardComponent,
    AdminLoginComponent,
    AdminUsersComponent,
    AdminStaffComponent,
    AdminDepartmentsComponent,
    AdminLayoutComponent,
    AdminAnalyticsComponent,
    AdminSettingsComponent,
    AdminLogsComponent,
    AdminHospitalsComponent,
    AdminAppointmentsComponent,
    AdminInsuranceComponent,
    AdminPctComponent,
    AdminPharmacyComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    AdminRoutingModule,
    ReactiveFormsModule,
    FormsModule
  ],
})
export class AdminModule {}
