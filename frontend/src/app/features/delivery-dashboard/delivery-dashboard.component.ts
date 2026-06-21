import { Component } from '@angular/core';

@Component({
  selector: 'app-delivery-dashboard',
  templateUrl: './delivery-dashboard.component.html',
  styleUrls: ['./delivery-dashboard.component.css']
})
export class DeliveryDashboardComponent {

  totalDeliveries = 12;
  pending = 4;
  completed = 6;
  cancelled = 2;

  getCompletionRate(): number {
    if (this.totalDeliveries === 0) return 0;
    return Math.round((this.completed / this.totalDeliveries) * 100);
  }

}