import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { DeliveryRoutingModule } from './delivery-routing.module';

import { DeliveryDashboardComponent } from '../delivery-dashboard/delivery-dashboard.component';
import { DeliveryHomepageComponent } from '../delivery-homepage/delivery-homepage.component';
import { DeliveryTasksComponent } from '../delivery-tasks/delivery-tasks.component';
import { DeliveryProfileComponent } from '../delivery-profile/delivery-profile.component';

@NgModule({
  declarations: [
    DeliveryDashboardComponent,
    DeliveryHomepageComponent,
    DeliveryTasksComponent,
    DeliveryProfileComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    DeliveryRoutingModule,
  ],
})
export class DeliveryModule {}