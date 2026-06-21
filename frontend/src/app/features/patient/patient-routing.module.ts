import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PatientDashboardComponent } from '../patient-dashboard/patient-dashboard.component';
import { PatientMedicalRecordComponent } from '../patient-medical-record/patient-medical-record.component';
import { PatientProfileComponent } from '../patient-profile/patient-profile.component';
import { PatientAppointmentsComponent } from './patient-appointments/patient-appointments.component';
import { PatientNotificationsComponent } from './patient-notifications/patient-notifications.component';
import { PatientPreconsultationFormComponent } from './patient-preconsultation-form/patient-preconsultation-form.component';

const routes: Routes = [
  { path: 'dashboard', component: PatientDashboardComponent },
  {
    path: 'medical-record',
    component: PatientMedicalRecordComponent,
    data: { allowGuest: true },
  },
  { path: 'profile', component: PatientProfileComponent },
  { path: 'appointments', component: PatientAppointmentsComponent },
  { path: 'notifications', component: PatientNotificationsComponent },
  { path: 'preconsultation/:appointmentId', component: PatientPreconsultationFormComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PatientRoutingModule {}
