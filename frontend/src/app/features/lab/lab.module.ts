import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { LabRoutingModule } from './lab-routing.module';

import { LabDashboardComponent } from '../lab-dashboard/lab-dashboard.component';
import { LabPendingReportsComponent } from '../lab-dashboard/lab-pending-reports/lab-pending-reports.component';
import { LabUploadResultComponent } from '../lab-dashboard/lab-upload-result/lab-upload-result.component';
import { LabAppointmentsComponent } from '../lab-dashboard/lab-appointments/lab-appointments.component';
import { LabProfileComponent } from '../lab-profile/lab-profile.component';

@NgModule({
  declarations: [
    LabDashboardComponent,
    LabPendingReportsComponent,
    LabUploadResultComponent,
    LabAppointmentsComponent,
    LabProfileComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    LabRoutingModule,
  ],
})
export class LabModule {}
