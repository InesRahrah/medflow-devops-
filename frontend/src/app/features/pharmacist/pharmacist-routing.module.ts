import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// ✅ Corrected paths according to your structure
import { PharmacistDashboardComponent } from '../pharmacist-dashboard/pharmacist-dashboard.component';
import { PharmacistHomepageComponent } from '../pharmacist-homepage/pharmacist-homepage.component';
import { PharmacistStockComponent } from '../pharmacist-stock/pharmacist-stock.component';
import { PharmacistProfileComponent } from '../pharmacist-profile/pharmacist-profile.component';
import { PharmacistRequestsComponent } from '../pharmacist-requests/pharmacist-requests.component';
import { ChatbotComponent } from '../chatbot/chatbot.component';


const routes: Routes = [
  { path: '', component: PharmacistHomepageComponent },
  { path: 'dashboard', component: PharmacistDashboardComponent },
  { path: 'stock', component: PharmacistStockComponent },
  { path: 'requests', component: PharmacistRequestsComponent },
  { path: 'profile', component: PharmacistProfileComponent },
  { path: 'chatbot', component: ChatbotComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PharmacistRoutingModule {}