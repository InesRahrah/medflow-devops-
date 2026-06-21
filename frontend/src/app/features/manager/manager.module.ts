import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from '../../shared/shared.module';
import { ManagerRoutingModule } from './manager-routing.module';

import { ManagerDashboardComponent } from '../manager-dashboard/manager-dashboard.component';

@NgModule({
  declarations: [ManagerDashboardComponent],
  imports: [CommonModule, SharedModule, ManagerRoutingModule],
})
export class ManagerModule {}
