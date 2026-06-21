import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { SharedModule } from '../../shared/shared.module';
import { PharmacistRoutingModule } from './pharmacist-routing.module';

// ✅ Corrected imports
import { PharmacistDashboardComponent } from '../pharmacist-dashboard/pharmacist-dashboard.component';
import { PharmacistHomepageComponent } from '../pharmacist-homepage/pharmacist-homepage.component';
import { PharmacistStockComponent } from '../pharmacist-stock/pharmacist-stock.component';
import { PharmacistRequestsComponent } from '../pharmacist-requests/pharmacist-requests.component';
import { PharmacistProfileComponent } from '../pharmacist-profile/pharmacist-profile.component';
import { ChatbotComponent } from '../chatbot/chatbot.component';
import { StockChartComponent } from '../stock-chart/stock-chart.component';

@NgModule({
  declarations: [
    PharmacistDashboardComponent,
    PharmacistHomepageComponent,
    PharmacistStockComponent,
    PharmacistRequestsComponent,
    PharmacistProfileComponent,
    StockChartComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    SharedModule,
    PharmacistRoutingModule,
    ChatbotComponent,
  ],
})
export class PharmacistModule {}