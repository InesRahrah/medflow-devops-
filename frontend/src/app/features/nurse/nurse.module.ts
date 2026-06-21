import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { NurseRoutingModule } from './nurse-routing.module';
import { NurseDashboardComponent } from './nurse-dashboard/nurse-dashboard.component';
import { NurseMyRoomsComponent } from './nurse-my-rooms/nurse-my-rooms.component';
import { NurseTasksComponent } from './nurse-tasks/nurse-tasks.component';
import { NursePatientsComponent } from './nurse-patients/nurse-patients.component';
import { NurseSettingsComponent } from './nurse-settings/nurse-settings.component';
import { NurseRoomDetailComponent } from './nurse-room-detail/nurse-room-detail.component';

@NgModule({
  declarations: [
    NurseDashboardComponent,
    NurseMyRoomsComponent,
    NurseTasksComponent,
    NursePatientsComponent,
    NurseSettingsComponent,
    NurseRoomDetailComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NurseRoutingModule,
    DragDropModule,
  ],
})
export class NurseModule {}