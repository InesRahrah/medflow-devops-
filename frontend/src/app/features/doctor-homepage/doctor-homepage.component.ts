import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppointmentService, Appointment } from '../../core/services/appointment.service';
import { DoctorService } from '../../core/services/doctor.service';
import { Subscription } from 'rxjs';

type TodayScheduleItem = {
  id: string;
  time: string;
  patient: string;
  reason: string;
  status: 'follow-up' | 'urgent' | 'consultation';
};

@Component({
  selector: 'app-doctor-homepage',
  templateUrl: './doctor-homepage.component.html',
  styleUrl: './doctor-homepage.component.css',
})
export class DoctorHomepageComponent implements OnInit, OnDestroy {
  doctorName: string = 'Doctor';
  fullGreeting: string = '';

  // Dashboard stats
  todayAppointments = 0;
  activePatients = 0;
  urgentCases = 0;
  followUpsNeeded = 0;

  // Today's appointments
  todaySchedule: TodayScheduleItem[] = [];

  private doctorIdCandidates: string[] = [];
  private readonly subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private doctorService: DoctorService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.doctorName = this.authService.getUserFirstName() || 'Doctor';
    this.fullGreeting = this.buildGreeting();

    this.doctorIdCandidates = this.resolveDoctorIdCandidates();
    this.loadTodayData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadTodayData(): void {
    this.subscriptions.add(
      this.doctorService.getMyDoctorId().subscribe((numericId) => {
        if (numericId) {
          this.doctorIdCandidates = this.doctorService.prependDoctorEntityIdCandidates(this.doctorIdCandidates, numericId);
        }

        this.authService.getProfile().subscribe({
          next: (profile: any) => {
            const extra = this.doctorService.getDoctorEntityIdCandidatesFromProfile(profile);

            if (extra.length > 0) {
              this.doctorIdCandidates = this.doctorService.prependDoctorEntityIdCandidates(this.doctorIdCandidates, ...extra);
            }

            if (this.doctorIdCandidates.length > 0) {
              this.tryLoadData(0);
            }
          },
          error: () => {
            if (this.doctorIdCandidates.length > 0) {
              this.tryLoadData(0);
            }
          },
        });
      }),
    );
  }

  private tryLoadData(candidateIndex: number): void {
    const candidateId = this.doctorIdCandidates[candidateIndex];
    if (!candidateId) {
      return;
    }

    this.subscriptions.add(
      this.appointmentService.getDoctorScheduledAppointments(candidateId).subscribe({
        next: (appointments) => {
          if (appointments.length === 0 && candidateIndex < this.doctorIdCandidates.length - 1) {
            this.tryLoadData(candidateIndex + 1);
            return;
          }

          this.processTodayAppointments(appointments);
        },
        error: () => {
          if (candidateIndex < this.doctorIdCandidates.length - 1) {
            this.tryLoadData(candidateIndex + 1);
          }
        },
      }),
    );
  }

  private processTodayAppointments(appointments: Appointment[]): void {
    const today = this.toDateKey(new Date());
    const todayAppointments = appointments.filter((apt) => {
      return this.toDateKey(new Date(apt.date)) === today;
    });

    // Sort by time ascending
    todayAppointments.sort((a, b) => a.time.localeCompare(b.time));

    this.todayAppointments = todayAppointments.length;
    this.calculateStats(todayAppointments);
    this.populateTodaySchedule(todayAppointments);
    this.calculateUniquePatients(appointments);
  }

  private calculateStats(todayAppointments: Appointment[]): void {
    let emergencyCount = 0;
    let followUpCount = 0;

    for (const apt of todayAppointments) {
      const type = this.normalizeAppointmentType(apt.notes || '');
      if (type === 'emergency') {
        emergencyCount++;
      } else if (type === 'follow-up') {
        followUpCount++;
      }
    }

    this.urgentCases = emergencyCount;
    this.followUpsNeeded = followUpCount;
  }

  private populateTodaySchedule(todayAppointments: Appointment[]): void {
    this.todaySchedule = todayAppointments.map((apt) => {
      const type = this.normalizeAppointmentType(apt.notes);
      const displayStatus = type === 'emergency' ? 'urgent' : type;
      return {
        id: String(apt.id),
        time: this.formatTime(apt.time),
        patient: apt.patientName,
        reason: apt.notes || '',
        status: displayStatus as 'follow-up' | 'urgent' | 'consultation',
      };
    });
  }

  private calculateUniquePatients(allAppointments: Appointment[]): void {
    const uniquePatients = new Set(allAppointments.map((apt) => apt.patientId));
    this.activePatients = uniquePatients.size;
  }

  private resolveDoctorIdCandidates(): string[] {
    return this.doctorService.getStoredDoctorEntityIdCandidates();
  }

  private normalizeAppointmentType(value: string | undefined): 'consultation' | 'follow-up' | 'emergency' {
    const normalized = String(value || '').toLowerCase().trim();
    if (normalized.includes('follow-up') || normalized.includes('follow up') || normalized.includes('follow_up')) {
      return 'follow-up';
    }
    if (normalized.includes('emergency')) {
      return 'emergency';
    }
    return 'consultation';
  }

  private formatTime(time24: string): string {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${String(displayHour).padStart(2, '0')}:${minutes} ${period}`;
  }

  private toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private buildGreeting(): string {
    const hour = new Date().getHours();
    let timeGreeting = '';
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 18) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';

    return `${timeGreeting} Dr. ${this.doctorName}`;
  }

  openPreconsultationSetup(): void {
    this.router.navigate(['/doctor/preconsultation/setup']);
  }
}
