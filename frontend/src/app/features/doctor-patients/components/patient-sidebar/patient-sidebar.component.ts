import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { PatientUserResponse } from '../../../../core/services/user.service';

@Component({
  selector: 'app-patient-sidebar',
  templateUrl: './patient-sidebar.component.html',
  styleUrl: './patient-sidebar.component.css',
})
export class PatientSidebarComponent implements OnInit, OnDestroy {
  @Input() patient: PatientUserResponse | null = null;
  @Output() onRefresh = new EventEmitter<void>();
  @Output() onGoBack = new EventEmitter<void>();
  @Output() onToggleSidebar = new EventEmitter<void>();

  constructor() {}

  ngOnInit(): void {}

  refreshPatient(): void {
    this.onRefresh.emit();
  }

  goBackToDashboard(): void {
    this.onGoBack.emit();
  }

  toggleSidebar(): void {
    this.onToggleSidebar.emit();
  }

  getInitials(): string {
    if (!this.patient) return 'N/A';
    const first = this.patient.firstName?.charAt(0) || '';
    const last = this.patient.lastName?.charAt(0) || '';
    return (first + last).toUpperCase();
  }

  getAgeFromDOB(): number | null {
    if (!this.patient || !this.patient.dateOfBirth) return null;
    const dob = new Date(this.patient.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  ngOnDestroy(): void {}
}
