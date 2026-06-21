import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NurseDashboardComponent } from './nurse-dashboard/nurse-dashboard.component';
import { NurseMyRoomsComponent } from './nurse-my-rooms/nurse-my-rooms.component';
import { NurseTasksComponent } from './nurse-tasks/nurse-tasks.component';
import { NursePatientsComponent } from './nurse-patients/nurse-patients.component';
import { NurseSettingsComponent } from './nurse-settings/nurse-settings.component';
import { NurseRoomDetailComponent } from './nurse-room-detail/nurse-room-detail.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    component: NurseDashboardComponent,
  },
  {
    path: 'my-rooms',
    component: NurseMyRoomsComponent,
  },
  {
    path: 'rooms/:roomId',
    component: NurseRoomDetailComponent,
  },
  {
    path: 'tasks',
    component: NurseTasksComponent,
  },
  {
    path: 'patients',
    component: NursePatientsComponent,
  },
  {
    path: 'settings',
    component: NurseSettingsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NurseRoutingModule {}
