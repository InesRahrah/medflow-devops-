
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { DoctorRoutingModule } from './doctor-routing.module';
import { DoctorDashboardComponent } from '../doctor-dashboard/doctor-dashboard.component';
import { DoctorPatientsComponent } from '../doctor-patients/doctor-patients.component';
import { DoctorPatientsContainerComponent } from '../doctor-patients/doctor-patients-container.component';
import { PatientsDashboardComponent } from '../doctor-patients/components/patients-dashboard/patients-dashboard.component';
import { PatientWorkspaceComponent } from '../doctor-patients/components/patient-workspace/patient-workspace.component';
import { PatientSidebarComponent } from '../doctor-patients/components/patient-sidebar/patient-sidebar.component';
import { PatientTabsComponent } from '../doctor-patients/components/patient-tabs/patient-tabs.component';
import { OverviewTabComponent } from '../doctor-patients/components/tabs/overview-tab.component';
import { ConsultationTabComponent } from '../doctor-patients/components/tabs/consultation-tab.component';
import { LabTabComponent } from '../doctor-patients/components/tabs/lab-tab.component';
import { PrescriptionTabComponent } from '../doctor-patients/components/tabs/prescription-tab.component';
import { MedicineCardComponent } from '../doctor-patients/components/medicine-card/medicine-card.component';
import { QuickActionsBarComponent } from '../doctor-patients/components/quick-actions-bar/quick-actions-bar.component';
import { DoctorHomepageComponent } from '../doctor-homepage/doctor-homepage.component';
import { DoctorProfileComponent } from '../doctor-profile/doctor-profile.component';
import { DoctorPreconsultationSetupComponent } from '../doctor-preconsultation-setup/doctor-preconsultation-setup.component';
import { DoctorPreconsultationResponseComponent } from '../doctor-preconsultation-response/doctor-preconsultation-response.component';
import { DoctorArticlesComponent } from './doctor-articles/doctor-articles.component';
import { QuillModule } from 'ngx-quill';


@NgModule({
  declarations: [
    DoctorDashboardComponent,
    DoctorPatientsComponent,
    DoctorPatientsContainerComponent,
    PatientsDashboardComponent,
    PatientWorkspaceComponent,
    PatientSidebarComponent,
    PatientTabsComponent,
    OverviewTabComponent,
    ConsultationTabComponent,
    LabTabComponent,
    PrescriptionTabComponent,
    MedicineCardComponent,
    QuickActionsBarComponent,
    DoctorHomepageComponent,
    /*DoctorProfileComponent,*/
    /*DoctorPreconsultationSetupComponent,*/
    DoctorPreconsultationResponseComponent,
    DoctorArticlesComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    DoctorRoutingModule,
    QuillModule.forRoot()
   
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DoctorModule {}