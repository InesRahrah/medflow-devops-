import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-logs',
  templateUrl: './admin-logs.component.html',
  styleUrls: ['./admin-logs.component.css']
})
export class AdminLogsComponent {
  isDropdownOpen = false;
  selectedFilter = 'All Activities';
  filterOptions = ['All Activities', 'Errors Only', 'Auth Events'];

  logs = [
    { type: 'Login', description: 'Admin session started', user: 'system_admin', time: '2024-03-22 14:30:12', status: 'Success' },
    { type: 'Auth', description: 'Password reset requested', user: 'john.doe@gmail.com', time: '2024-03-22 13:15:05', status: 'Pending' },
    { type: 'System', description: 'Database backup completed', user: 'cron_job', time: '2024-03-22 04:00:00', status: 'Success' },
    { type: 'Audit', description: 'Patient record accessed (ID: 1042)', user: 'dr.smith', time: '2024-03-21 16:45:33', status: 'Success' },
    { type: 'Error', description: 'Invalid API Key on /v1/auth', user: 'external_svc', time: '2024-03-21 15:20:10', status: 'Fail' }
  ];

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectFilter(option: string) {
    this.selectedFilter = option;
    this.isDropdownOpen = false;
  }
}
