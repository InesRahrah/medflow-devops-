import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CentralPharmacyLayoutComponent } from './central-pharmacy-layout/central-pharmacy-layout.component';
import { CentralPharmacyDashboardComponent } from '../central-pharmacy-dashboard/central-pharmacy-dashboard.component';
import { CentralPharmacyHomepageComponent } from '../central-pharmacy-homepage/central-pharmacy-homepage.component';
import { CentralPharmacyRequestsComponent } from '../central-pharmacy-requests/central-pharmacy-requests.component';
import { CentralPharmacyProfileComponent } from '../central-pharmacy-profile/central-pharmacy-profile.component';

const routes: Routes = [
  {
    path: '',
    component: CentralPharmacyLayoutComponent,
    children: [
      { path: '', component: CentralPharmacyHomepageComponent },
      { path: 'dashboard', component: CentralPharmacyDashboardComponent },
      { path: 'requests', component: CentralPharmacyRequestsComponent },
      { path: 'profile', component: CentralPharmacyProfileComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CentralPharmacyRoutingModule {}
