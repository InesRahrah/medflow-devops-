import { Component } from '@angular/core';

@Component({
  selector: 'app-hospital-equipment',
  templateUrl: './hospital-equipment.component.html',
  styleUrl: './hospital-equipment.component.css'
})
export class HospitalEquipmentComponent {
  selectedStatus = 'All Statuses';
  readonly statusOptions = [
    'All Statuses',
    'Operational',
    'Maintenance'
  ];
}
