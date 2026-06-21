import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HospitalDashboardComponent } from '../hospital-dashboard/hospital-dashboard.component';
import { HospitalDepartmentsComponent } from '../hospital-departments/hospital-departments.component';
import { HospitalEquipmentComponent } from '../hospital-equipment/hospital-equipment.component';
import { HospitalStaffComponent } from '../hospital-staff/hospital-staff.component';
import { HospitalProfileComponent } from '../hospital-profile/hospital-profile.component';

const routes: Routes = [
  { path: 'dashboard', component: HospitalDashboardComponent },
  { path: 'departments', component: HospitalDepartmentsComponent },
  { path: 'equipment', component: HospitalEquipmentComponent },
  { path: 'staff', component: HospitalStaffComponent },
  {
    path: 'staff/:id',
    loadComponent: () =>
      import('../hospital-staff/hospital-staff-detail.component').then(
        (m) => m.HospitalStaffDetailComponent,
      ),
  },
  { path: 'profile', component: HospitalProfileComponent },
  {
    path: 'hospital-structure',
    loadChildren: () =>
      import('../hospital-structure/hospital-structure.module').then(
        (m) => m.HospitalStructureModule,
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HospitalRoutingModule {}
