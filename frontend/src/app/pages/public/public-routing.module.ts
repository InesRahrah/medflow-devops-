import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from '../home/home.component';
import { ServicesPageComponent } from './services-page/services-page.component';
import { DepartmentsPageComponent } from './departments-page/departments-page.component';
import { DoctorsPageComponent } from './doctors-page/doctors-page.component';
import { DoctorPublicProfilePageComponent } from './doctor-public-profile-page/doctor-public-profile-page.component';
import { AppointmentsPageComponent } from './appointments-page/appointments-page.component';
import { ContactPageComponent } from './contact-page/contact-page.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'services', component: ServicesPageComponent },
  { path: 'departments', component: DepartmentsPageComponent },
  { path: 'doctors', component: DoctorsPageComponent },
  { path: 'doctors/:id', component: DoctorPublicProfilePageComponent },
  { path: 'appointments', component: AppointmentsPageComponent },
  { path: 'contact', component: ContactPageComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PublicRoutingModule {}
