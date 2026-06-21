import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent {
  users = [
    { name: 'John Cooper', email: 'john.cooper@example.com', role: 'Patient', joined: 'Mar 12, 2024', status: 'Active' },
    { name: 'Sarah Wilson', email: 's.wilson@healthcare.com', role: 'Nurse', joined: 'Mar 10, 2024', status: 'Active' },
    { name: 'Michael Chen', email: 'mchen.doc@example.com', role: 'Doctor', joined: 'Mar 08, 2024', status: 'Pending' },
    { name: 'Elena Rodriguez', email: 'elena.r@insurance.com', role: 'Insurance', joined: 'Mar 05, 2024', status: 'Active' },
    { name: 'David Miller', email: 'dmiller@labo.com', role: 'Lab Specialist', joined: 'Feb 28, 2024', status: 'Inactive' }
  ];
}
