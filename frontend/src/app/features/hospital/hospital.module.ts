import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { HospitalRoutingModule } from './hospital-routing.module';

import { HospitalDashboardComponent } from '../hospital-dashboard/hospital-dashboard.component';
import { HospitalDepartmentsComponent } from '../hospital-departments/hospital-departments.component';
import { HospitalEquipmentComponent } from '../hospital-equipment/hospital-equipment.component';
import { HospitalStaffComponent } from '../hospital-staff/hospital-staff.component';
import { HospitalProfileComponent } from '../hospital-profile/hospital-profile.component';
import { StaffTasksModalComponent } from '../../shared/components/staff-tasks-modal/staff-tasks-modal.component';

@NgModule({
  declarations: [
    HospitalDashboardComponent,
    HospitalDepartmentsComponent,
    HospitalEquipmentComponent,
    HospitalStaffComponent,
    HospitalProfileComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    HospitalRoutingModule,
    StaffTasksModalComponent,
  ],
})
export class HospitalModule {}
