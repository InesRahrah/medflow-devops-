import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';

export interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  date: string;
  time: string;
  reason: string;
  status: 'confirmed' | 'follow-up' | 'urgent' | 'cancelled';
}

export interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private appointmentsUpdated = new Subject<void>();

  // Mock data
  private mockAppointments: Appointment[] = [
    {
      id: 1,
      patientId: 1,
      patientName: 'John Doe',
      doctorId: 1,
      doctorName: 'Dr. Smith',
      date: '2026-03-18',
      time: '09:00',
      reason: 'Follow up',
      status: 'follow-up',
    },
    {
      id: 2,
      patientId: 2,
      patientName: 'Jane Smith',
      doctorId: 1,
      doctorName: 'Dr. Smith',
      date: '2026-03-18',
      time: '10:30',
      reason: 'Routine checkup',
      status: 'confirmed',
    },
  ];

  private mockPatients: Patient[] = [
    { id: 1, firstName: 'John', lastName: 'Doe', email: 'john.doe@email.com' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@email.com' },
    { id: 3, firstName: 'Ahmed', lastName: 'Khaled', email: 'ahmed.khaled@email.com' },
  ];

  constructor(private http: HttpClient) {}

  getDoctorAppointments(doctorId: number): Observable<Appointment[]> {
    return of(this.mockAppointments.filter(apt => apt.doctorId === doctorId));
  }

  getAppointmentsForDate(doctorId: number, date: string): Observable<Appointment[]> {
    return of(this.mockAppointments.filter(apt =>
      apt.doctorId === doctorId && apt.date === date
    ));
  }

  getPatients(): Observable<Patient[]> {
    return of(this.mockPatients);
  }

  createAppointment(appointment: Omit<Appointment, 'id'>): Observable<Appointment> {
    const newAppointment: Appointment = {
      ...appointment,
      id: Math.max(...this.mockAppointments.map(a => a.id), 0) + 1,
    };
    this.mockAppointments.push(newAppointment);
    this.appointmentsUpdated.next();
    return of(newAppointment);
  }

  isTimeSlotAvailable(doctorId: number, date: string, time: string): Observable<boolean> {
    const conflicting = this.mockAppointments.find(apt =>
      apt.doctorId === doctorId && apt.date === date && apt.time === time
    );
    return of(!conflicting);
  }

  getPatientAppointments(patientId: number): Observable<Appointment[]> {
    return of(this.mockAppointments.filter(apt => apt.patientId === patientId));
  }

  getAppointmentsUpdatedObservable(): Observable<void> {
    return this.appointmentsUpdated.asObservable();
  }
}

