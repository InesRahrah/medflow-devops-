import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';

// Pages
import { HomeComponent } from '../home/home.component';
import { ServicesPageComponent } from './services-page/services-page.component';
import { DepartmentsPageComponent } from './departments-page/departments-page.component';
import { DoctorsPageComponent } from './doctors-page/doctors-page.component';
import { DoctorPublicProfilePageComponent } from './doctor-public-profile-page/doctor-public-profile-page.component';
import { AppointmentsPageComponent } from './appointments-page/appointments-page.component';
import { ContactPageComponent } from './contact-page/contact-page.component';

import { PublicRoutingModule } from './public-routing.module';

@NgModule({
  declarations: [
    HomeComponent,
    ServicesPageComponent,
    DepartmentsPageComponent,
    DoctorsPageComponent,
    DoctorPublicProfilePageComponent,
    AppointmentsPageComponent,
    ContactPageComponent,
  ],
  imports: [
    CommonModule,
    PublicRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
  ],
})
export class PublicModule {}
