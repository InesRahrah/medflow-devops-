import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-staff',
  templateUrl: './admin-staff.component.html',
  styleUrls: ['./admin-staff.component.css']
})
export class AdminStaffComponent {
  staffList = [
    { name: 'Dr. Gregory House', department: 'Diagnostics', role: 'Doctor', shifts: 'Morning', status: 'On Duty' },
    { name: 'Nurse Joy', department: 'Pediatrics', role: 'Nurse', shifts: 'Night', status: 'Off Duty' },
    { name: 'Dr. John Watson', department: 'General Medicine', role: 'Doctor', shifts: 'Morning', status: 'On Duty' },
    { name: 'Dr. Shaun Murphy', department: 'Surgery', role: 'Doctor', shifts: 'Full-time', status: 'On Leave' },
    { name: 'Nurse Ratched', department: 'Psychiatry', role: 'Head Nurse', shifts: 'Evening', status: 'On Duty' }
  ];
}
