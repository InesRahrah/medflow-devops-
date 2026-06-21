import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LabDashboardComponent } from '../lab-dashboard/lab-dashboard.component';
import { LabPendingReportsComponent } from '../lab-dashboard/lab-pending-reports/lab-pending-reports.component';
import { LabUploadResultComponent } from '../lab-dashboard/lab-upload-result/lab-upload-result.component';
import { LabAppointmentsComponent } from '../lab-dashboard/lab-appointments/lab-appointments.component';
import { LabProfileComponent } from '../lab-profile/lab-profile.component';

const routes: Routes = [
  { path: 'dashboard', component: LabDashboardComponent },
  { path: 'profile', component: LabProfileComponent },
  { path: 'pending-reports', component: LabPendingReportsComponent },
  { path: 'upload-result/:id', component: LabUploadResultComponent },
  { path: 'appointments', component: LabAppointmentsComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LabRoutingModule {}
