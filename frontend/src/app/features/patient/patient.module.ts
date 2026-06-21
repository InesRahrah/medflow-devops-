import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { PatientRoutingModule } from './patient-routing.module';

import { PatientDashboardComponent } from '../patient-dashboard/patient-dashboard.component';
import { PatientMedicalRecordComponent } from '../patient-medical-record/patient-medical-record.component';
import { PatientTreatmentComponent } from '../patient-medical-record/patient-treatment.component';
import { PatientProfileComponent } from '../patient-profile/patient-profile.component';
import { PatientAppointmentsComponent } from './patient-appointments/patient-appointments.component';
import { PatientNotificationsComponent } from './patient-notifications/patient-notifications.component';
import { PatientPreconsultationFormComponent } from './patient-preconsultation-form/patient-preconsultation-form.component';
import { AppointmentCardComponent } from './patient-appointments/components/appointment-card/appointment-card.component';
import { TimelineItemComponent } from './patient-appointments/components/timeline-item/timeline-item.component';

@NgModule({
  declarations: [
    PatientDashboardComponent,
    PatientMedicalRecordComponent,
    PatientTreatmentComponent,
    PatientProfileComponent,
    PatientAppointmentsComponent,
    AppointmentCardComponent,
    TimelineItemComponent,
    PatientNotificationsComponent,
    PatientPreconsultationFormComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    PatientRoutingModule,
  ],
})
export class PatientModule {}
