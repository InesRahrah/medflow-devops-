import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { HospitalStructureRoutingModule } from './hospital-structure-routing.module';
import { SharedModule } from '../../shared/shared.module';

import { StructureOverviewComponent } from './pages/structure-overview/structure-overview.component';
import { FloorDetailComponent } from './pages/floor-detail/floor-detail.component';
import { RoomDetailComponent } from './pages/room-detail/room-detail.component';

import { FloorCardComponent } from './components/floor-card/floor-card.component';
import { RoomCardComponent } from './components/room-card/room-card.component';
import { BedItemComponent } from './components/bed-item/bed-item.component';

@NgModule({
  declarations: [
    StructureOverviewComponent,
    FloorDetailComponent,
    RoomDetailComponent,
    FloorCardComponent,
    RoomCardComponent,
    BedItemComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    HospitalStructureRoutingModule,
    SharedModule,
  ],
})
export class HospitalStructureModule {}
