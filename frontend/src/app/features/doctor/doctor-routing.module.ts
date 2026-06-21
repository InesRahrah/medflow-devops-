import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DoctorDashboardComponent } from '../doctor-dashboard/doctor-dashboard.component';
import { DoctorPatientsContainerComponent } from '../doctor-patients/doctor-patients-container.component';
import { PatientsDashboardComponent } from '../doctor-patients/components/patients-dashboard/patients-dashboard.component';
import { PatientWorkspaceComponent } from '../doctor-patients/components/patient-workspace/patient-workspace.component';
import { DoctorHomepageComponent } from '../doctor-homepage/doctor-homepage.component';
import { DoctorProfileComponent } from '../doctor-profile/doctor-profile.component';
import { DoctorPreconsultationSetupComponent } from '../doctor-preconsultation-setup/doctor-preconsultation-setup.component';
import { DoctorPreconsultationResponseComponent } from '../doctor-preconsultation-response/doctor-preconsultation-response.component';
import { DoctorArticlesComponent } from './doctor-articles/doctor-articles.component';

const routes: Routes = [
  { path: '', component: DoctorHomepageComponent },
  { path: 'dashboard', component: DoctorDashboardComponent },
  {
    path: 'patients',
    component: DoctorPatientsContainerComponent,
    children: [
      { path: '', component: PatientsDashboardComponent },
      { path: ':id', component: PatientWorkspaceComponent },
    ],
  },
  { path: 'profile', component: DoctorProfileComponent },
  { path: 'preconsultation/setup', component: DoctorPreconsultationSetupComponent },
  { path: 'preconsultation/responses/:appointmentId', component: DoctorPreconsultationResponseComponent },
  { path: 'articles', component: DoctorArticlesComponent },
    { path: 'profile/:id', component: DoctorProfileComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DoctorRoutingModule {}

