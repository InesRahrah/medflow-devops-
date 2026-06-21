import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { InsuranceRoutingModule } from './insurance-routing.module';

import { InsuranceDashboardComponent } from '../insurance-dashboard/insurance-dashboard.component';
import { InsuranceClaimsQueueComponent } from '../insurance-claims-queue/insurance-claims-queue.component';
import { InsuranceProfileComponent } from '../insurance-profile/insurance-profile.component';

@NgModule({
  declarations: [
    InsuranceDashboardComponent,
    InsuranceClaimsQueueComponent,
    InsuranceProfileComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    InsuranceRoutingModule,
  ],
})
export class InsuranceModule {}
