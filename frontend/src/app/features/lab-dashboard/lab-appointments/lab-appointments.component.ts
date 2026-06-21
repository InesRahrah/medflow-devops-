import { Component } from '@angular/core';

@Component({
  selector: 'app-lab-appointments',
  templateUrl: './lab-appointments.component.html',
  styleUrl: './lab-appointments.component.css'
})
export class LabAppointmentsComponent {
  appointments = [
    { id: 101, patientName: 'John Doe', testType: 'MRI Brain', time: '09:00 AM', date: '2026-03-19', status: 'Confirmed' },
    { id: 102, patientName: 'Alice Smith', testType: 'Blood Test', time: '10:30 AM', date: '2026-03-19', status: 'Arrived' },
    { id: 103, patientName: 'Robert Johnson', testType: 'CT Scan', time: '01:00 PM', date: '2026-03-19', status: 'Scheduled' },
    { id: 104, patientName: 'Emily Davis', testType: 'X-Ray Chest', time: '02:30 PM', date: '2026-03-19', status: 'Scheduled' },
    { id: 105, patientName: 'Michael Wilson', testType: 'Ultrasound', time: '04:00 PM', date: '2026-03-19', status: 'Cancelled' }
  ];

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'status-confirmed';
      case 'arrived': return 'status-arrived';
      case 'scheduled': return 'status-scheduled';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }
}
