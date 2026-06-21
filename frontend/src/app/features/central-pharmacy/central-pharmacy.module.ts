import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { CentralPharmacyRoutingModule } from './central-pharmacy-routing.module';

import { CentralPharmacyLayoutComponent } from './central-pharmacy-layout/central-pharmacy-layout.component';
import { CentralPharmacyDashboardComponent } from '../central-pharmacy-dashboard/central-pharmacy-dashboard.component';
import { CentralPharmacyHomepageComponent } from '../central-pharmacy-homepage/central-pharmacy-homepage.component';
import { CentralPharmacyRequestsComponent } from '../central-pharmacy-requests/central-pharmacy-requests.component';
import { CentralPharmacyProfileComponent } from '../central-pharmacy-profile/central-pharmacy-profile.component';

@NgModule({
  declarations: [
    CentralPharmacyLayoutComponent,
    CentralPharmacyDashboardComponent,
    CentralPharmacyHomepageComponent,
    CentralPharmacyRequestsComponent,
    CentralPharmacyProfileComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    CentralPharmacyRoutingModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CentralPharmacyModule {}
