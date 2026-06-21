import { Component, OnInit } from '@angular/core';
import {
  AppointmentService,
  AdminDashboardMetrics,
  FlaggedPatient,
  PenaltyProfile,
  WaivablePenaltyEvent,
} from '../../../core/services/appointment.service';

@Component({
  selector: 'app-admin-appointments',
  templateUrl: './admin-appointments.component.html',
  styleUrls: ['./admin-appointments.component.css']
})
export class AdminAppointmentsComponent implements OnInit {
  dashboardData: AdminDashboardMetrics | null = null;
  isLoading = true;
  error: string | null = null;
  dashboardLoadFailed = false;

  flaggedPatients: FlaggedPatient[] = [];
  isFlaggedLoading = false;
  flaggedLoadFailed = false;
  selectedPatient: FlaggedPatient | null = null;

  penaltyProfile: PenaltyProfile | null = null;
  isPenaltyLoading = false;
  penaltyError: string | null = null;

  fromDate = '';
  toDate = '';

  constructor(private appointmentService: AppointmentService) {
    this.initializeDateRange();
  }

  ngOnInit(): void {
    this.loadDashboard();
    this.loadFlaggedPatients();
  }

  private initializeDateRange(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    this.fromDate = this.formatDateForInput(thirtyDaysAgo);
    this.toDate = this.formatDateForInput(today);
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.error = null;
    
    // Convert input dates to YYYY-MM-DD format expected by backend
    const from = this.fromDate || undefined;
    const to = this.toDate || undefined;
    const symptomLimit = 5;

    this.appointmentService.getAdminAppointmentsDashboard(from, to, symptomLimit).subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.dashboardLoadFailed = false;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard:', err);
        this.error = 'Dashboard metrics unavailable — backend returned an error. Showing empty state.';
        this.dashboardData = this.createEmptyDashboardMetrics();
        this.dashboardLoadFailed = true;
        this.isLoading = false;
      }
    });
  }

  onDateRangeChange(): void {
    this.loadDashboard();
  }

  loadFlaggedPatients(): void {
    this.isFlaggedLoading = true;
    this.flaggedLoadFailed = false;
    this.penaltyError = null;
    this.appointmentService.getFlaggedPatients().subscribe({
      next: (patients) => {
        this.flaggedPatients = patients;
        this.isFlaggedLoading = false;
      },
      error: (err) => {
        console.error('Error loading flagged patients:', err);
        this.flaggedLoadFailed = true;
        this.penaltyError = 'Could not load flagged patients from backend (server error). Retry or contact the backend team.';
        this.flaggedPatients = [];
        this.isFlaggedLoading = false;
      },
    });
  }

  selectPatient(patient: FlaggedPatient): void {
    this.selectedPatient = patient;
    this.penaltyProfile = null;
    this.penaltyError = null;
    this.loadPenaltyData();
  }

  closePatientDetail(): void {
    this.selectedPatient = null;
    this.penaltyProfile = null;
    this.penaltyError = null;
  }

  loadPenaltyData(): void {
    const patientId = this.selectedPatient?.patientId;
    if (!patientId) {
      return;
    }

    this.isPenaltyLoading = true;
    this.penaltyError = null;

    this.appointmentService.getPatientPenaltyProfile(patientId).subscribe({
      next: (profile) => {
        this.penaltyProfile = profile;
        this.isPenaltyLoading = false;
      },
      error: (err) => {
        console.error('Error loading penalty profile:', err);
        this.penaltyProfile = null;
        this.penaltyError = 'Failed to load patient risk profile.';
        this.isPenaltyLoading = false;
      },
    });
  }


  formatDateTime(value: string | null | undefined): string {
    const raw = String(value || '').trim();
    if (!raw) return 'N/A';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  getTierClass(tier: string): string {
    const t = String(tier || '').toUpperCase();
    if (t.includes('HIGH')) return 'tier-high';
    if (t.includes('MEDIUM')) return 'tier-medium';
    return 'tier-low';
  }

  getProfileTierClass(): string {
    return this.getTierClass(this.penaltyProfile?.tier ?? '');
  }

  private createEmptyDashboardMetrics(): AdminDashboardMetrics {
    const today = new Date().toISOString().slice(0, 10);
    return {
      from: this.fromDate || today,
      to: this.toDate || today,
      summary: {
        totalAppointments: 0,
        patientsAssisted: 0,
        scheduledAppointments: 0,
        cancelledAppointments: 0,
        pendingDoctorConfirmations: 0,
        pendingPatientConfirmations: 0,
        bookingSuccessRate: 0,
        cancellationRate: 0,
        lateCancelledAppointments: 0,
        noShowAppointments: 0,
        lateCancellationRate: 0,
        noShowRate: 0,
      },
      topSymptoms: [],
    };
  }

  getSuccessRateColor(): string {
    if (!this.dashboardData) return '#64748b';
    const rate = this.dashboardData.summary.bookingSuccessRate;
    if (rate >= 80) return '#10b981';
    if (rate >= 60) return '#f59e0b';
    return '#ef4444';
  }

  getCancellationRateColor(): string {
    if (!this.dashboardData) return '#64748b';
    const rate = this.dashboardData.summary.cancellationRate;
    if (rate <= 10) return '#10b981';
    if (rate <= 20) return '#f59e0b';
    return '#ef4444';
  }
}
