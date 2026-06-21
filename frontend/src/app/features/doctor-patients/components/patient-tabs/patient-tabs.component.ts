import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-patient-tabs',
  templateUrl: './patient-tabs.component.html',
  styleUrl: './patient-tabs.component.css',
})
export class PatientTabsComponent {
  @Input() activeTab: 'overview' | 'consultation' | 'lab' | 'prescription' =
    'overview';
  @Output() tabChange = new EventEmitter<
    'overview' | 'consultation' | 'lab' | 'prescription'
  >();

  tabs: {
    id: 'overview' | 'consultation' | 'lab' | 'prescription';
    label: string;
    icon: string;
  }[] = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'consultation', label: 'Consultation', icon: '💬' },
    { id: 'lab', label: 'Laboratory', icon: '🖼️' },
    { id: 'prescription', label: 'Prescription', icon: '💊' },
  ];

  selectTab(tabId: 'overview' | 'consultation' | 'lab' | 'prescription'): void {
    this.tabChange.emit(tabId);
  }
}
