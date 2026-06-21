import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { StructureOverviewComponent } from './pages/structure-overview/structure-overview.component';
import { FloorDetailComponent } from './pages/floor-detail/floor-detail.component';
import { RoomDetailComponent } from './pages/room-detail/room-detail.component';

const routes: Routes = [
  { path: '', component: StructureOverviewComponent },
  { path: 'floor/:floorId', component: FloorDetailComponent },
  { path: 'floor/:floorId/room/:roomId', component: RoomDetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HospitalStructureRoutingModule {}
