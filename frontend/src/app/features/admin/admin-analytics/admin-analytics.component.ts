import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-analytics',
  templateUrl: './admin-analytics.component.html',
  styleUrls: ['./admin-analytics.component.css']
})
export class AdminAnalyticsComponent {
  analyticsStats = [
    { label: 'Patient Influx', value: '+24%', trend: 'up' },
    { label: 'System Usage', value: '89%', trend: 'up' },
    { label: 'Error Rate', value: '0.02%', trend: 'down' },
    { label: 'Avg Clinic Time', value: '45m', trend: 'down' }
  ];
}
