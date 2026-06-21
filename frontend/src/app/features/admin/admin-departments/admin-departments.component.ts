import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-departments',
  templateUrl: './admin-departments.component.html',
  styleUrls: ['./admin-departments.component.css']
})
export class AdminDepartmentsComponent {
  departments = [
    { name: 'Cardiology', head: 'Dr. Gregory House', staffCount: 12, patients: 45, status: 'Active' },
    { name: 'Pediatrics', head: 'Dr. Joy Benson', staffCount: 8, patients: 22, status: 'Active' },
    { name: 'Emergency', head: 'Dr. Shaun Murphy', staffCount: 24, patients: 110, status: 'High Load' },
    { name: 'Neurology', head: 'Dr. Elena Vance', staffCount: 6, patients: 15, status: 'Active' },
    { name: 'Radiology', head: 'Dr. John Watson', staffCount: 5, patients: 30, status: 'Maintenance' }
  ];
}
