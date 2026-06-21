import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-settings',
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css']
})
export class AdminSettingsComponent {
  settingsGroups = [
    {
      title: 'General Settings',
      items: [
        { label: 'Platform Name', value: 'MedFlow Healthcare', type: 'text' },
        { label: 'Timezone', value: 'UTC+01:00 (London)', type: 'select' },
        { label: 'Language', value: 'English (US)', type: 'select' }
      ]
    },
    {
      title: 'Security',
      items: [
        { label: 'Two-Factor Authentication', value: true, type: 'toggle' },
        { label: 'Session Timeout', value: '30 Minutes', type: 'select' },
        { label: 'Login Alerts', value: true, type: 'toggle' }
      ]
    }
  ];
}
