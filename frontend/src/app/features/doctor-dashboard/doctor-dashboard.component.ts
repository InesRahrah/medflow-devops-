import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppointmentService, Appointment } from '../../core/services/appointment.service';
import { DoctorService } from '../../core/services/doctor.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { PatientUserResponse, UserService } from '../../core/services/user.service';
import { Subscription, forkJoin, of, timer } from 'rxjs';
import { catchError } from 'rxjs/operators';

type AppointmentMetadata = {
  patient?: string;
  reason?: string;
};

type PendingPatientDecision = 'cancel' | 'postpone' | null;

type DoctorAppointment = {
  id: number;
  patientId: string;
  patient: string;
  time: string;
  reason: string;
  visitType?: string;
  meetingUrl?: string;
  pendingPatientDecision?: PendingPatientDecision;
  pendingScheduledAt?: string;
  status:
    | 'scheduled'
    | 'completed'
    | 'attended'
    | 'cancelled'
    | 'pending_doctor_confirmation'
    | 'pending_patient_confirmation'
    | 'rejected_by_doctor';
};

type PersistedDoctorAppointment = DoctorAppointment & {
  date: string;
};

type AppointmentFilter = 'all' | 'today' | 'upcoming' | 'emergency';

type DashboardActionMode = 'cancel' | 'postpone';

type CalendarDay = {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  appointmentCount: number;
  consultationCount: number;
  followUpCount: number;
  emergencyCount: number;
  densityLevel: 'none' | 'light' | 'medium' | 'heavy';
};

@Component({
  selector: 'app-doctor-dashboard',
  templateUrl: './doctor-dashboard.component.html',
  styleUrl: './doctor-dashboard.component.css',
})
export class DoctorDashboardComponent implements OnInit, OnDestroy {
  readonly weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly appointmentFilters: AppointmentFilter[] = ['all', 'today', 'upcoming', 'emergency'];
  private readonly STORAGE_PREFIX = 'medflow_doctor_calendar_cache_';

  currentMonth = new Date();
  selectedDate = new Date();
  selectedFilter: AppointmentFilter = 'all';
  calendarDays: CalendarDay[] = [];
  showAppointmentModal = false;
  actionFeedback: { message: string; variant: 'success' | 'error' } | null = null;
  actionModal:
    | {
        isOpen: true;
        mode: DashboardActionMode;
        appointment: DoctorAppointment;
        date: string;
        time: string;
        isSubmitting: boolean;
        error: string;
      }
    | {
        isOpen: false;
        mode: null;
        appointment: null;
        date: string;
        time: string;
        isSubmitting: boolean;
        error: string;
      } = {
    isOpen: false,
    mode: null,
    appointment: null,
    date: '',
    time: '',
    isSubmitting: false,
    error: '',
  };
  private appointmentMap: Record<string, DoctorAppointment[]> = {};
  private appointmentMetadataById = new Map<number, AppointmentMetadata>();
  private patientProfilesById = new Map<string, PatientUserResponse>();
  private doctorId: string | null = null;
  private doctorIdCandidates: string[] = [];
  private readonly subscriptions = new Subscription();
  /** IDs of appointments created by the doctor but awaiting patient confirmation. */
  private pendingDoctorAppointmentIds = new Set<number>();

  constructor(
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private doctorService: DoctorService,
    private userService: UserService,
    private notificationService: NotificationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.currentMonth = new Date(
      this.selectedDate.getFullYear(),
      this.selectedDate.getMonth(),
      1,
    );
    this.doctorIdCandidates = this.resolveDoctorIdCandidates();
    this.doctorId = this.doctorIdCandidates[0] ?? null;
    this.appointmentMap = this.loadPersistedAppointmentMap();
    this.buildCalendar();

    if (this.doctorIdCandidates.length > 0) {
      this.loadDoctorAppointments();
    }

    this.subscriptions.add(
      this.appointmentService.refreshDoctorAppointments$.subscribe(() => {
        this.loadDoctorAppointments();
      }),
    );

    this.subscriptions.add(
      this.notificationService.enrichedNotifications$.subscribe((notifications) => {
        this.appointmentMetadataById = this.buildAppointmentMetadataMap(notifications);
        this.appointmentMap = this.applyNotificationMetadataToMap(this.appointmentMap);
        this.persistAppointmentMap();
        this.buildCalendar();

        // When a pending appointment is now ACCEPTED in notifications, reload calendar
        if (this.pendingDoctorAppointmentIds.size > 0) {
          const acceptedIds = notifications
            .filter(n => n.workflowStatus === 'ACCEPTED' && this.pendingDoctorAppointmentIds.has(n.appointmentId))
            .map(n => n.appointmentId);
          if (acceptedIds.length > 0) {
            acceptedIds.forEach(id => this.pendingDoctorAppointmentIds.delete(id));
            if (this.doctorIdCandidates.length > 0) {
              this.loadDoctorAppointments();
            }
          }
        }
      }),
    );

    // Periodic refresh every 30s to pick up patient confirmations
    this.subscriptions.add(
      timer(30_000, 30_000).subscribe(() => {
        if (this.pendingDoctorAppointmentIds.size > 0 && this.doctorIdCandidates.length > 0) {
          this.loadDoctorAppointments();
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get monthTitle(): string {
    return this.currentMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  get selectedDateTitle(): string {
    return this.selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  get selectedAppointments(): DoctorAppointment[] {
    return this.getAppointmentsForDate(this.selectedDate);
  }

  get filteredSelectedAppointments(): DoctorAppointment[] {
    const items = this.selectedAppointments;

    switch (this.selectedFilter) {
      case 'today':
        return this.isSameDay(this.selectedDate, new Date()) ? items : [];
      case 'upcoming':
        if (this.isBeforeToday(this.selectedDate)) {
          return [];
        }

        if (!this.isSameDay(this.selectedDate, new Date())) {
          return items;
        }

        return items.filter((item) => this.isUpcomingTimeForSelectedDate(item.time));
      case 'emergency':
        return items.filter((item) => this.normalizeAppointmentType(item.reason) === 'emergency');
      default:
        return items;
    }
  }

  get selectedDateSummary(): string {
    const total = this.uniqueSelectedPatientsCount;
    const urgent = this.urgentSelectedAppointmentsCount;

    const patientLabel = total === 1 ? 'patient' : 'patients';
    const urgentLabel = urgent === 1 ? 'urgent' : 'urgent';

    return `${total} ${patientLabel}, ${urgent} ${urgentLabel}`;
  }

  get uniqueSelectedPatientsCount(): number {
    return new Set(
      this.selectedAppointments.map((item) => {
        const patientId = String(item.patientId || '').trim();
        return patientId || String(item.patient || '').trim().toLowerCase();
      }),
    ).size;
  }

  get urgentSelectedAppointmentsCount(): number {
    return this.selectedAppointments.filter(
      (item) => this.normalizeAppointmentType(item.reason) === 'emergency',
    ).length;
  }

  get activeFilterLabel(): string {
    if (this.selectedFilter === 'all') {
      return 'Showing all appointments';
    }
    if (this.selectedFilter === 'today') {
      return 'Showing today\'s appointments';
    }
    if (this.selectedFilter === 'upcoming') {
      return 'Showing upcoming appointments';
    }
    return 'Showing emergency appointments';
  }

  get emptyStateTitle(): string {
    return this.selectedAppointments.length === 0
      ? 'No appointments scheduled for this day'
      : 'No appointments match this filter';
  }

  get emptyStateDescription(): string {
    return this.selectedAppointments.length === 0
      ? 'Choose another day from the calendar or add a new appointment for this date.'
      : 'Try a different filter or switch to another day to review more appointments.';
  }

  getAppointmentTypeLabel(value: string): string {
    const normalized = this.normalizeAppointmentType(value);
    if (normalized === 'follow-up') return 'Follow-up';
    if (normalized === 'emergency') return 'Emergency';
    return 'Consultation';
  }

  getAppointmentTypeClass(value: string): string {
    const normalized = this.normalizeAppointmentType(value);
    if (normalized === 'follow-up') return 'type-followup';
    if (normalized === 'emergency') return 'type-emergency';
    return 'type-consultation';
  }

  getAppointmentTypeCardClass(value: string): string {
    const normalized = this.normalizeAppointmentType(value);
    if (normalized === 'follow-up') return 'status-followup';
    if (normalized === 'emergency') return 'status-urgent';
    return 'status-consultation';
  }

  getAppointmentFilterLabel(filter: AppointmentFilter): string {
    if (filter === 'all') return 'All';
    if (filter === 'today') return 'Today';
    if (filter === 'upcoming') return 'Upcoming';
    return 'Emergency';
  }

  getAppointmentCondition(value: string): string {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return 'General consultation';
    }

    if (this.isGenericAppointmentReason(normalized)) {
      return this.getAppointmentTypeLabel(normalized);
    }

    return normalized;
  }

  getPatientDemographics(appointment: DoctorAppointment): string {
    const profile = this.patientProfilesById.get(appointment.patientId);
    if (!profile) {
      return 'Age unavailable • Gender unavailable';
    }

    const age = this.getAgeFromDateOfBirth(profile.dateOfBirth);
    const ageLabel = age != null ? `${age} years` : 'Age unavailable';
    const genderLabel = this.formatGender(profile.gender) || 'Gender unavailable';
    return `${ageLabel} • ${genderLabel}`;
  }

  getAppointmentPriorityLabel(appointment: DoctorAppointment): string {
    const normalized = this.normalizeAppointmentType(appointment.reason);
    if (normalized === 'emergency') return 'Urgent';
    if (normalized === 'follow-up') return 'Follow-up';
    return 'Regular';
  }

  hasPendingPatientResponse(appointment: DoctorAppointment): boolean {
    return !!appointment.pendingPatientDecision;
  }

  getPendingPatientResponseLabel(appointment: DoctorAppointment): string {
    if (appointment.pendingPatientDecision === 'cancel') {
      return 'Cancellation requested - waiting for patient response';
    }

    const proposed = this.formatPendingDateTime(appointment.pendingScheduledAt || '');
    if (proposed) {
      return `Postpone requested to ${proposed} - waiting for patient response`;
    }

    return 'Postpone requested - waiting for patient response';
  }

  setAppointmentFilter(filter: AppointmentFilter): void {
    this.selectedFilter = filter;

    if (filter === 'today' && !this.isSameDay(this.selectedDate, new Date())) {
      this.selectedDate = new Date();
      this.currentMonth = new Date(
        this.selectedDate.getFullYear(),
        this.selectedDate.getMonth(),
        1,
      );
      this.buildCalendar();
    }
  }

  previousMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1,
    );
    this.buildCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1,
    );
    this.buildCalendar();
  }

  selectDate(day: CalendarDay): void {
    this.selectedDate = new Date(day.date);
    if (!day.inCurrentMonth) {
      this.currentMonth = new Date(
        day.date.getFullYear(),
        day.date.getMonth(),
        1,
      );
    }
    this.buildCalendar();
  }

  viewIntake(appointmentId: number): void {
    void this.router.navigate(['/doctor/preconsultation/responses', appointmentId]);
  }

  startConsultation(item: DoctorAppointment): void {
    if (this.isTelemedicineVisit(item) && item.meetingUrl) {
      let url = item.meetingUrl.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      void this.router.navigate(['/doctor/preconsultation/responses', item.id]);
    }
  }

  postponeAppointment(appointment: DoctorAppointment): void {
    this.actionModal = {
      isOpen: true,
      mode: 'postpone',
      appointment,
      date: this.toKey(this.selectedDate),
      time: appointment.time,
      isSubmitting: false,
      error: '',
    };
  }

  cancelAppointment(appointment: DoctorAppointment): void {
    this.actionModal = {
      isOpen: true,
      mode: 'cancel',
      appointment,
      date: this.toKey(this.selectedDate),
      time: appointment.time,
      isSubmitting: false,
      error: '',
    };
  }

  confirmAttendance(appointment: DoctorAppointment): void {
    const doctorUserId = this.authService.getUserId();
    if (!doctorUserId) {
      this.showActionFeedback('Unable to resolve doctor identity for attendance confirmation.', 'error');
      return;
    }

    this.subscriptions.add(
      this.appointmentService.doctorConfirmAttendance(appointment.id, doctorUserId).subscribe({
        next: () => {
          this.showActionFeedback('Attendance confirmed and patient risk profile updated.', 'success');
          this.loadDoctorAppointments();
        },
        error: (err: any) => {
          const message = err?.error?.message || err?.error || 'Unable to confirm attendance right now. Please try again.';
          this.showActionFeedback(message, 'error');
        },
      }),
    );
  }

  closeActionModal(): void {
    this.actionModal = {
      isOpen: false,
      mode: null,
      appointment: null,
      date: '',
      time: '',
      isSubmitting: false,
      error: '',
    };
  }

  submitActionModal(): void {
    if (!this.actionModal.isOpen || !this.actionModal.appointment || this.actionModal.isSubmitting) {
      return;
    }

    const appointmentId = this.actionModal.appointment.id;

    if (this.actionModal.mode === 'postpone') {
      const trimmedDate = this.actionModal.date.trim();
      const trimmedTime = this.actionModal.time.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        this.actionModal = { ...this.actionModal, error: 'Enter the date in YYYY-MM-DD format.' };
        return;
      }

      if (!/^\d{2}:\d{2}$/.test(trimmedTime)) {
        this.actionModal = { ...this.actionModal, error: 'Enter the time in HH:MM format.' };
        return;
      }

      const newScheduledAt = this.buildScheduledAt(trimmedDate, trimmedTime);
      if (!newScheduledAt) {
        this.actionModal = { ...this.actionModal, error: 'Invalid date or time for postponing this appointment.' };
        return;
      }

      this.actionModal = { ...this.actionModal, isSubmitting: true, error: '' };
      this.subscriptions.add(
        this.appointmentService.requestPostponeByDoctor(appointmentId, newScheduledAt).subscribe({
          next: () => {
            this.markPendingPatientDecisionForAppointment(appointmentId, 'postpone', newScheduledAt);
            this.closeActionModal();
            this.showActionFeedback('Postpone request sent to the patient.', 'success');
            this.loadDoctorAppointments();
          },
          error: () => {
            if (this.actionModal.isOpen) {
              this.actionModal = {
                ...this.actionModal,
                isSubmitting: false,
                error: 'Unable to send the postpone request. Please try again.',
              };
            }
          },
        }),
      );
      return;
    }

    this.actionModal = { ...this.actionModal, isSubmitting: true, error: '' };
    this.subscriptions.add(
      this.appointmentService.requestCancel(appointmentId, 'DOCTOR').subscribe({
        next: () => {
          this.markPendingPatientDecisionForAppointment(appointmentId, 'cancel');
          this.closeActionModal();
          this.showActionFeedback('Cancellation request sent to the patient.', 'success');
          this.loadDoctorAppointments();
        },
        error: () => {
          if (this.actionModal.isOpen) {
            this.actionModal = {
              ...this.actionModal,
              isSubmitting: false,
              error: 'Unable to send the cancellation request. Please try again.',
            };
          }
        },
      }),
    );
  }

  openAppointmentModal(): void {
    this.showAppointmentModal = true;
  }

  closeAppointmentModal(): void {
    this.showAppointmentModal = false;
  }

  onAppointmentCreated(appointment: Appointment): void {
    if (!this.isConfirmedScheduleStatus(appointment.status)) {
      // Track pending appointments so calendar refreshes when patient confirms
      if (appointment.status === 'pending_patient_confirmation' && appointment.id) {
        this.pendingDoctorAppointmentIds.add(Number(appointment.id));
      }
      this.closeAppointmentModal();
      return;
    }

    // Add to local appointment map
    const dateKey = appointment.date;
    if (!this.appointmentMap[dateKey]) {
      this.appointmentMap[dateKey] = [];
    }

    const localAppointment: DoctorAppointment = {
      id: appointment.id,
      patientId: String(appointment.patientId ?? ''),
      patient: appointment.patientName,
      time: appointment.time,
      reason: appointment.notes || '',
      status: appointment.status
    };

    this.appointmentMap[dateKey].push(localAppointment);
    this.loadMissingPatientProfiles([localAppointment]);

    // If the appointment is for today, automatically switch to today's view
    const appointmentDate = new Date(appointment.date);
    const today = new Date();
    if (this.isSameDay(appointmentDate, today)) {
      this.selectedDate = new Date(today);
    }

    this.persistAppointmentMap();
    this.buildCalendar();
    this.closeAppointmentModal();

    if (this.doctorIdCandidates.length > 0) {
      this.loadDoctorAppointments();
    }
  }

  private loadDoctorAppointments(): void {
    this.subscriptions.add(
      this.doctorService.getMyDoctorId().subscribe((numericId) => {
        if (numericId) {
          this.doctorIdCandidates = this.doctorService.prependDoctorEntityIdCandidates(this.doctorIdCandidates, numericId);
          this.doctorId = numericId;
        }

        this.authService.getProfile().subscribe({
          next: (profile: any) => {
            const extra = this.doctorService.getDoctorEntityIdCandidatesFromProfile(profile);

            if (extra.length > 0) {
              this.doctorIdCandidates = this.doctorService.prependDoctorEntityIdCandidates(this.doctorIdCandidates, ...extra);
            }

            if (this.doctorIdCandidates.length > 0) {
              this.tryLoadDoctorAppointments(0);
            }
          },
          error: () => {
            if (this.doctorIdCandidates.length > 0) {
              this.tryLoadDoctorAppointments(0);
            }
          },
        });
      }),
    );
  }

  private tryLoadDoctorAppointments(candidateIndex: number): void {
    const candidateId = this.doctorIdCandidates[candidateIndex];
    if (!candidateId) {
      // Keep current map so optimistic accepted items are not lost
      // when refresh cannot resolve a valid doctor candidate id.
      return;
    }

    this.subscriptions.add(
      this.appointmentService.getDoctorScheduledAppointments(candidateId).subscribe({
        next: (appointments) => {
          this.doctorId = candidateId;
          const backendMap = this.createAppointmentMap(appointments);
          this.appointmentMap = this.mergeAppointmentMaps(backendMap, this.loadPersistedAppointmentMap());
          this.persistAppointmentMap();
          this.loadMissingPatientProfiles(this.flattenAppointments(this.appointmentMap));
          this.buildCalendar();
        },
        error: () => {
          if (candidateIndex < this.doctorIdCandidates.length - 1) {
            this.tryLoadDoctorAppointments(candidateIndex + 1);
            return;
          }

          // If every candidate fails, clear stale cached appointments
          // so deleted backend records are not shown forever.
          this.appointmentMap = {};
          this.persistAppointmentMap();
          this.buildCalendar();
        },
      }),
    );
  }

  private buildCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - startOffset);

    this.calendarDays = Array.from({ length: 42 }).map((_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      const appointments = this.getAppointmentsForDate(date);
      const consultationCount = appointments.filter(
        (item) => this.normalizeAppointmentType(item.reason) === 'consultation',
      ).length;
      const followUpCount = appointments.filter(
        (item) => this.normalizeAppointmentType(item.reason) === 'follow-up',
      ).length;
      const emergencyCount = appointments.filter(
        (item) => this.normalizeAppointmentType(item.reason) === 'emergency',
      ).length;
      const appointmentCount = appointments.length;

      return {
        date,
        inCurrentMonth: date.getMonth() === month,
        isToday: this.isSameDay(date, new Date()),
        isSelected: this.isSameDay(date, this.selectedDate),
        appointmentCount,
        consultationCount,
        followUpCount,
        emergencyCount,
        densityLevel: this.getDensityLevel(appointmentCount),
      };
    });
  }

  private getAppointmentsForDate(date: Date): DoctorAppointment[] {
    return (this.appointmentMap[this.toKey(date)] || []).filter((appointment) =>
      this.isConfirmedScheduleStatus(appointment.status),
    );
  }

  private isConfirmedScheduleStatus(status: string): boolean {
    const s = String(status || '').toLowerCase();
    return s === 'scheduled' || s === 'attended' || s === 'completed';
  }

  private resolveDoctorIdCandidates(): string[] {
    return this.doctorService.getStoredDoctorEntityIdCandidates();
  }

  private createAppointmentMap(appointments: Appointment[]): Record<string, DoctorAppointment[]> {
    const nextMap = appointments.reduce<Record<string, DoctorAppointment[]>>((acc, appointment) => {
      const normalized = this.toDoctorAppointment(appointment);
      const key = this.toKey(new Date(`${appointment.date}T00:00:00`));

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(normalized);
      return acc;
    }, {});

    Object.values(nextMap).forEach((items) => {
      items.sort((left, right) => left.time.localeCompare(right.time));
    });

    return this.applyNotificationMetadataToMap(nextMap);
  }

  private mergeAppointmentMaps(
    primary: Record<string, DoctorAppointment[]>,
    secondary: Record<string, DoctorAppointment[]>,
  ): Record<string, DoctorAppointment[]> {
    const merged: Record<string, DoctorAppointment[]> = {};
    // Keep backend as source of truth for existence of appointments.
    // Cached data is only used to enrich items that still exist in backend.
    Object.keys(primary).forEach((dateKey) => {
      const byId = new Map<number, DoctorAppointment>();
      const secondaryById = new Map<number, DoctorAppointment>();

      for (const item of secondary[dateKey] ?? []) {
        secondaryById.set(item.id, item);
      }

      for (const item of primary[dateKey] ?? []) {
        // Preserve a real patient name from cache over a blank 'Patient' fallback
        const existing = secondaryById.get(item.id);
        const isGenericName = (n: string) => ['patient', 'unknown user', 'unknown', ''].includes(String(n || '').trim().toLowerCase());
        const mergedItem = (existing && isGenericName(item.patient) && !isGenericName(existing.patient))
          ? { ...item, patient: existing.patient, patientId: item.patientId || existing.patientId }
          : item;
        byId.set(item.id, mergedItem);
      }

      merged[dateKey] = Array.from(byId.values()).sort((left, right) => left.time.localeCompare(right.time));
    });

    return merged;
  }

  private loadPersistedAppointmentMap(): Record<string, DoctorAppointment[]> {
    const storageKey = this.getStorageKey();
    if (!storageKey) {
      return {};
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return {};
      }

      return parsed.reduce<Record<string, DoctorAppointment[]>>((acc, item: PersistedDoctorAppointment) => {
        const date = String(item?.date ?? '').trim();
        if (!date || !this.isConfirmedScheduleStatus(item?.status ?? '')) {
          return acc;
        }

        const normalized: DoctorAppointment = {
          id: Number(item.id),
          patientId: String(item.patientId ?? '').trim(),
          patient: String(item.patient ?? '').trim(),
          time: String(item.time ?? '').trim(),
          reason: String(item.reason ?? '').trim(),
          visitType: this.normalizeVisitType(String((item as any)?.visitType ?? '').trim()),
          pendingPatientDecision: this.normalizePendingPatientDecision(item.pendingPatientDecision),
          pendingScheduledAt: String(item.pendingScheduledAt ?? '').trim(),
          status: item.status as DoctorAppointment['status'],
        };

        if (!acc[date]) {
          acc[date] = [];
        }

        acc[date].push(normalized);
        return acc;
      }, {});
    } catch {
      return {};
    }
  }

  private persistAppointmentMap(): void {
    const storageKey = this.getStorageKey();
    if (!storageKey) {
      return;
    }

    try {
      const payload = Object.entries(this.appointmentMap).flatMap(([date, items]) =>
        items
          .filter((item) => this.isConfirmedScheduleStatus(item.status))
          .map((item) => ({ ...item, date })),
      );

      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore storage quota errors
    }
  }

  private getStorageKey(): string | null {
    const identity = this.authService.getUserId() || this.doctorId || this.doctorIdCandidates[0] || '';
    const normalized = String(identity).trim();
    return normalized ? `${this.STORAGE_PREFIX}${normalized}` : null;
  }

  private toDoctorAppointment(appointment: Appointment): DoctorAppointment {
    const metadata = this.appointmentMetadataById.get(Number(appointment.id));
    const patient = this.isGenericPatientName(appointment.patientName)
      ? (metadata?.patient || appointment.patientName || 'Patient')
      : appointment.patientName;
    const reason = this.isGenericAppointmentReason(appointment.notes || '')
      ? (metadata?.reason || appointment.notes || '')
      : (appointment.notes || '');

    let mappedStatus: DoctorAppointment['status'];
    const s = String(appointment.status || '').toLowerCase();
    if (s === 'scheduled') mappedStatus = 'scheduled';
    else if (s === 'completed') mappedStatus = 'completed';
    else if (s === 'attended') mappedStatus = 'attended';
    else if (s === 'cancelled') mappedStatus = 'cancelled';
    else if (s === 'rejected_by_doctor') mappedStatus = 'rejected_by_doctor';
    else if (s === 'pending_patient_confirmation') mappedStatus = 'pending_patient_confirmation';
    else mappedStatus = 'pending_doctor_confirmation';

    return {
      id: appointment.id,
      patientId: String(appointment.patientId ?? ''),
      patient,
      time: appointment.time,
      reason,
      visitType: this.normalizeVisitType((appointment as any).visitType),
      meetingUrl: String(appointment.meetingUrl ?? '').trim() || undefined,
      pendingPatientDecision: this.resolvePendingPatientDecision(appointment),
      pendingScheduledAt: String(appointment.pendingScheduledAt || '').trim(),
      status: mappedStatus,
    };
  }

  isTelemedicineVisit(item: DoctorAppointment): boolean {
    return this.normalizeVisitType(item.visitType) === 'TELEMEDICINE';
  }

  private normalizeVisitType(raw: any): string {
    const normalized = String(raw ?? '').trim().toUpperCase();
    if (['TELEMEDICINE', 'ONLINE', 'VIRTUAL'].includes(normalized)) {
      return 'TELEMEDICINE';
    }
    if (['IN_PERSON', 'IN-PERSON', 'IN PERSON', 'OFFLINE'].includes(normalized)) {
      return 'IN_PERSON';
    }
    return normalized;
  }

  private buildAppointmentMetadataMap(notifications: Array<{ appointmentId: number; patientName?: string; actorName?: string; message?: string }>): Map<number, AppointmentMetadata> {
    const next = new Map<number, AppointmentMetadata>();

    for (const notification of notifications) {
      const appointmentId = Number(notification?.appointmentId);
      if (!Number.isFinite(appointmentId) || appointmentId <= 0) {
        continue;
      }

      const patientCandidate = String(notification?.patientName || notification?.actorName || '').trim();
      const patient = this.isGenericPatientName(patientCandidate) ? '' : patientCandidate;
      const reason = this.inferAppointmentReasonFromText(String(notification?.message || ''));
      const existing = next.get(appointmentId);

      next.set(appointmentId, {
        patient: patient || existing?.patient,
        reason: reason || existing?.reason,
      });
    }

    return next;
  }

  private applyNotificationMetadataToMap(source: Record<string, DoctorAppointment[]>): Record<string, DoctorAppointment[]> {
    return Object.fromEntries(
      Object.entries(source).map(([date, items]) => [
        date,
        items.map((item) => {
          const metadata = this.appointmentMetadataById.get(Number(item.id));
          return {
            ...item,
            patient: this.isGenericPatientName(item.patient) ? (metadata?.patient || item.patient) : item.patient,
            reason: this.isGenericAppointmentReason(item.reason) ? (metadata?.reason || item.reason) : item.reason,
          };
        }),
      ]),
    );
  }

  private inferAppointmentReasonFromText(value: string): string {
    const normalized = String(value || '').toLowerCase();
    if (normalized.includes('follow-up') || normalized.includes('follow up')) {
      return 'Follow-up';
    }
    if (normalized.includes('emergency')) {
      return 'Emergency';
    }
    if (normalized.includes('consultation')) {
      return 'Consultation';
    }
    return '';
  }

  private isGenericPatientName(value: string): boolean {
    return ['patient', 'unknown user', 'unknown', ''].includes(String(value || '').trim().toLowerCase());
  }

  private isGenericAppointmentReason(value: string): boolean {
    const normalized = String(value || '').trim().toLowerCase();
    return !normalized || normalized === 'consultation';
  }

  private normalizeAppointmentType(value: string): 'consultation' | 'follow-up' | 'emergency' {
    const normalized = String(value || '').toLowerCase().trim();
    if (normalized.includes('follow-up') || normalized.includes('follow up') || normalized.includes('follow_up')) {
      return 'follow-up';
    }
    if (normalized.includes('emergency')) {
      return 'emergency';
    }
    return 'consultation';
  }

  private loadMissingPatientProfiles(appointments: DoctorAppointment[]): void {
    const uniquePatientIds = Array.from(
      new Set(
        appointments
          .map((appointment) => String(appointment.patientId || '').trim())
          .filter((patientId) => !!patientId && !this.patientProfilesById.has(patientId)),
      ),
    );

    if (uniquePatientIds.length === 0) {
      return;
    }

    const requests = uniquePatientIds.map((patientId) =>
      this.userService.getPatientProfile(patientId).pipe(
        catchError(() => of(null)),
      ),
    );

    this.subscriptions.add(
      forkJoin(requests).subscribe((profiles) => {
        profiles.forEach((profile, index) => {
          if (profile) {
            this.patientProfilesById.set(uniquePatientIds[index], profile);
          }
        });
      }),
    );
  }

  private flattenAppointments(source: Record<string, DoctorAppointment[]>): DoctorAppointment[] {
    return Object.values(source).flat();
  }

  private getAgeFromDateOfBirth(dateOfBirth?: string): number | null {
    if (!dateOfBirth) {
      return null;
    }

    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age -= 1;
    }
    return age >= 0 ? age : null;
  }

  private formatGender(gender?: string): string {
    const normalized = String(gender || '').trim().toLowerCase();
    if (!normalized) {
      return '';
    }
    if (normalized === 'male') return 'Male';
    if (normalized === 'female') return 'Female';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private resolvePendingPatientDecision(appointment: Appointment): PendingPatientDecision {
    const pendingStatus = String(appointment.pendingStatus || '').trim().toUpperCase();
    const pendingScheduledAt = String(appointment.pendingScheduledAt || '').trim();
    const awaitingPatient = Boolean(appointment.awaitingPatientConfirmation);

    if (!awaitingPatient && !pendingStatus && !pendingScheduledAt) {
      return null;
    }

    if (pendingStatus.includes('CANCEL')) {
      return 'cancel';
    }

    if (
      !!pendingScheduledAt ||
      pendingStatus.includes('POSTPONE') ||
      pendingStatus.includes('RESCHEDULE')
    ) {
      return 'postpone';
    }

    return null;
  }

  private normalizePendingPatientDecision(value: unknown): PendingPatientDecision {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'cancel') return 'cancel';
    if (normalized === 'postpone') return 'postpone';
    return null;
  }

  private formatPendingDateTime(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  private markPendingPatientDecisionForAppointment(
    appointmentId: number,
    decision: Exclude<PendingPatientDecision, null>,
    pendingScheduledAt = '',
  ): void {
    let changed = false;

    this.appointmentMap = Object.fromEntries(
      Object.entries(this.appointmentMap).map(([dateKey, items]) => [
        dateKey,
        items.map((item) => {
          if (Number(item.id) !== Number(appointmentId)) {
            return item;
          }

          changed = true;
          return {
            ...item,
            pendingPatientDecision: decision,
            pendingScheduledAt: decision === 'postpone' ? pendingScheduledAt : '',
          };
        }),
      ]),
    );

    if (changed) {
      this.persistAppointmentMap();
      this.buildCalendar();
    }
  }

  private buildScheduledAt(date: string, time: string): string | null {
    const parsed = new Date(`${date}T${time}:00`);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString();
  }

  private showActionFeedback(message: string, variant: 'success' | 'error'): void {
    this.actionFeedback = { message, variant };

    window.setTimeout(() => {
      if (this.actionFeedback?.message === message) {
        this.actionFeedback = null;
      }
    }, 3200);
  }

  private getDensityLevel(count: number): CalendarDay['densityLevel'] {
    if (count <= 0) return 'none';
    if (count <= 2) return 'light';
    if (count <= 4) return 'medium';
    return 'heavy';
  }

  private isBeforeToday(date: Date): boolean {
    const today = new Date();
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return normalizedDate < normalizedToday;
  }

  private isUpcomingTimeForSelectedDate(time: string): boolean {
    const [hours, minutes] = String(time || '').split(':').map((value) => Number(value));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return true;
    }

    const slotDate = new Date(this.selectedDate);
    slotDate.setHours(hours, minutes, 0, 0);
    return slotDate.getTime() >= Date.now();
  }

  private toKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}
