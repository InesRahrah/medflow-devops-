import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DeliveryDashboardComponent } from '../delivery-dashboard/delivery-dashboard.component';
import { DeliveryHomepageComponent } from '../delivery-homepage/delivery-homepage.component';
import { DeliveryTasksComponent } from '../delivery-tasks/delivery-tasks.component';
import { DeliveryProfileComponent } from '../delivery-profile/delivery-profile.component';

const routes: Routes = [
  { path: '', component: DeliveryHomepageComponent },
  { path: 'dashboard', component: DeliveryDashboardComponent },
  { path: 'tasks', component: DeliveryTasksComponent },
  { path: 'profile', component: DeliveryProfileComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DeliveryRoutingModule {}