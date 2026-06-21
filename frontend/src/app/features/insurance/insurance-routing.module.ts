import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InsuranceDashboardComponent } from '../insurance-dashboard/insurance-dashboard.component';
import { InsuranceClaimsQueueComponent } from '../insurance-claims-queue/insurance-claims-queue.component';
import { InsuranceProfileComponent } from '../insurance-profile/insurance-profile.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, 
  { path: 'dashboard', component: InsuranceDashboardComponent },
  { path: 'claims-queue', component: InsuranceClaimsQueueComponent },
  { path: 'profile', component: InsuranceProfileComponent },
  { path: 'profile/:id', component: InsuranceProfileComponent }, 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InsuranceRoutingModule {}
