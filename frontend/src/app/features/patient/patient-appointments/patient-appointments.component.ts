import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, forkJoin, of, firstValueFrom } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { DoctorService, Doctor } from '../../../core/services/doctor.service';
import { AppointmentService } from '../../../core/services/appointment.service';

type AppointmentStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'pending_doctor_confirmation'
  | 'rejected_by_doctor';

type AppointmentTab = 'upcoming' | 'past';
type AppointmentViewMode = 'list' | 'timeline';
type AppointmentSort = 'nearest' | 'latest';
type AppointmentFilterStatus =
  | 'all'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'pending_doctor_confirmation'
  | 'rejected_by_doctor';

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  appointmentType: string;
  visitType: string;
  meetingProvider: string;
  meetingUrl?: string;
  canJoin: boolean;
  joinAvailableAt?: string;
  status: AppointmentStatus;
  notes: string;
  hasServerId: boolean;
}

interface AppointmentDateGroup {
  dateKey: string;
  dateLabel: string;
  isToday: boolean;
  appointments: Appointment[];
}

interface AppointmentHistoryItem {
  id: string;
  dateLabel: string;
  timeLabel: string;
  statusLabel: string;
  status: AppointmentStatus;
  typeLabel: string;
}

type ActionMode = 'edit' | 'postpone' | 'delete';

@Component({
  selector: 'app-patient-appointments',
  templateUrl: './patient-appointments.component.html',
  styleUrls: ['./patient-appointments.component.css']
})
export class PatientAppointmentsComponent implements OnInit, OnDestroy {
  private readonly appointmentsApiUrl = '/api/v1/appointments';

  appointments: Appointment[] = [];
  upcomingAppointments: Appointment[] = [];
  pastAppointments: Appointment[] = [];

  activeTab: AppointmentTab = 'upcoming';
  viewMode: AppointmentViewMode = 'list';
  selectedStatus: AppointmentFilterStatus = 'all';
  selectedDate = '';
  searchTerm = '';
  sortBy: AppointmentSort = 'nearest';

  isLoading = false;
  errorMessage = '';
  showActionModal = false;
  showDetailsPanel = false;
  joinErrorMessage = '';
  actionMode: ActionMode = 'edit';
  selectedAppointment: Appointment | null = null;
  detailAppointment: Appointment | null = null;
  actionErrorMessage = '';
  isSubmittingAction = false;
  appointmentForm: FormGroup;

  private doctorNameById = new Map<string, string>();
  private doctorDetailsById = new Map<string, Doctor>();
  private subscription: Subscription = new Subscription();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private doctorService: DoctorService,
    private formBuilder: FormBuilder,
    private appointmentService: AppointmentService,
    private router: Router,
  ) {
    this.appointmentForm = this.formBuilder.group({
      date: [''],
      time: [''],
      notes: [''],
    });
  }

  ngOnInit(): void {
    this.loadAppointments();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadAppointments(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.joinErrorMessage = '';

    const patientIdCandidates = this.authService.getPatientEntityIdCandidates();
    const patientId = patientIdCandidates[0] ?? null;
    if (!patientId) {
      this.isLoading = false;
      this.errorMessage = 'Unable to identify patient. Please log in again.';
      this.clearAppointments();
      return;
    }

    this.subscription.add(
      this.doctorService.getDoctors().subscribe({
        next: (doctors: Doctor[]) => {
          this.doctorNameById = new Map(
            doctors
              .filter((doctor) => doctor.id !== null && doctor.id !== undefined)
              .map((doctor) => [String(doctor.id), doctor.name])
          );
          this.doctorDetailsById = new Map(
            doctors
              .filter((doctor) => doctor.id !== null && doctor.id !== undefined)
              .map((doctor) => [String(doctor.id), doctor])
          );
          this.fetchAppointmentsFromGlobalEndpoint(patientIdCandidates);
        },
        error: () => {
          this.doctorNameById = new Map();
          this.doctorDetailsById = new Map();
          this.fetchAppointmentsFromGlobalEndpoint(patientIdCandidates);
        }
      })
    );
  }

  private fetchAppointmentsFromGlobalEndpoint(patientIdCandidates: string[]): void {
    this.subscription.add(
      this.http.get<any>(this.appointmentsApiUrl).subscribe({
        next: (response) => this.applyAppointmentsResponse(response, patientIdCandidates),
        error: (error) => {
          if (error?.status === 401) {
            this.authService.logout();
            this.errorMessage = 'Your session has expired or is unauthorized. Please log in again.';
          } else {
            this.errorMessage = 'Failed to load appointments. Please try again.';
          }
          this.clearAppointments();
          this.isLoading = false;
        }
      })
    );
  }

  private applyAppointmentsResponse(response: any, patientIdCandidates: string[]): void {
    const normalized = this.normalizeAppointments(response, patientIdCandidates);
    this.enrichDoctorNames(normalized).then((enriched) => {
      this.appointments = enriched;
      this.categorizeAppointments();
      this.isLoading = false;
    });
  }

  private enrichDoctorNames(appointments: Appointment[]): Promise<Appointment[]> {
    const unresolvedIds = [...new Set(
      appointments
        .filter((appointment) => appointment.doctorId && appointment.doctorName === 'Assigned doctor')
        .map((appointment) => appointment.doctorId)
    )];

    if (unresolvedIds.length === 0) {
      return Promise.resolve(appointments);
    }

    const requests = unresolvedIds.reduce((acc, id) => {
      acc[id] = this.http.get<any>(`/api/v1/users/${id}`).pipe(
        map((raw) => this.extractDoctorNameFromUserPayload(raw)),
        catchError(() => of(null))
      );
      return acc;
    }, {} as Record<string, any>);

    return new Promise((resolve) => {
      this.subscription.add(
        forkJoin(requests).subscribe({
          next: (results) => {
            Object.entries(results as Record<string, string | null>).forEach(([id, name]) => {
              if (name) {
                this.doctorNameById.set(id, name);
              }
            });

            resolve(
              appointments.map((appointment) => ({
                ...appointment,
                doctorName: this.doctorNameById.get(appointment.doctorId) ?? appointment.doctorName
              }))
            );
          },
          error: () => resolve(appointments)
        })
      );
    });
  }

  private categorizeAppointments(): void {
    const now = new Date();

    this.upcomingAppointments = this.appointments
      .filter((appointment) => this.toDateObject(appointment) >= now)
      .sort((a, b) => this.toDateObject(a).getTime() - this.toDateObject(b).getTime());

    this.pastAppointments = this.appointments
      .filter((appointment) => this.toDateObject(appointment) < now)
      .map((appointment) =>
        appointment.status === 'scheduled'
          ? { ...appointment, status: 'completed' as AppointmentStatus }
          : appointment
      )
      .sort((a, b) => this.toDateObject(b).getTime() - this.toDateObject(a).getTime());
  }

  setActiveTab(tab: AppointmentTab): void {
    if (this.activeTab === tab) {
      return;
    }

    this.activeTab = tab;

    if (this.sortBy === 'nearest' && tab === 'past') {
      this.sortBy = 'latest';
    }
    if (this.sortBy === 'latest' && tab === 'upcoming') {
      this.sortBy = 'nearest';
    }
  }

  setViewMode(mode: AppointmentViewMode): void {
    this.viewMode = mode;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.selectedDate = '';
    this.sortBy = this.activeTab === 'upcoming' ? 'nearest' : 'latest';
  }

  get statusFilterOptions(): Array<{ value: AppointmentFilterStatus; label: string }> {
    const options: Array<{ value: AppointmentFilterStatus; label: string }> = [
      { value: 'all', label: 'All statuses' },
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'pending_doctor_confirmation', label: 'Pending approval' },
      { value: 'rejected_by_doctor', label: 'Rejected by doctor' },
    ];

    if (this.activeTab === 'past') {
      options.push({ value: 'completed', label: 'Completed' });
      options.push({ value: 'cancelled', label: 'Cancelled' });
    }

    return options;
  }

  get activeTabCount(): number {
    return this.filteredAppointments.length;
  }

  get currentPatientName(): string {
    const firstName = this.authService.getUserFirstName();
    const lastName = this.authService.getUserLastName();
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || 'Current patient';
  }

  get canManageDetailAppointment(): boolean {
    return !!this.detailAppointment && this.activeTab !== 'past';
  }

  get detailDoctor(): Doctor | null {
    if (!this.detailAppointment?.doctorId) {
      return null;
    }

    return this.doctorDetailsById.get(this.detailAppointment.doctorId) ?? null;
  }

  get detailAppointmentHistory(): AppointmentHistoryItem[] {
    if (!this.detailAppointment) {
      return [];
    }

    return this.appointments
      .filter((appointment) =>
        appointment.doctorId === this.detailAppointment?.doctorId &&
        appointment.id !== this.detailAppointment.id
      )
      .sort((a, b) => this.toDateObject(b).getTime() - this.toDateObject(a).getTime())
      .slice(0, 4)
      .map((appointment) => ({
        id: appointment.id,
        dateLabel: this.formatDate(appointment.date),
        timeLabel: this.formatTime(appointment.time),
        statusLabel: this.getStatusLabel(appointment.status),
        status: appointment.status,
        typeLabel: appointment.appointmentType,
      }));
  }

  get detailDoctorStats(): Array<{ label: string; value: string }> {
    const doctor = this.detailDoctor;
    if (!doctor) {
      return [];
    }

    return [
      { label: 'Specialty', value: doctor.specialty || 'General Practitioner' },
      { label: 'Experience', value: doctor.experience || 'N/A' },
      { label: 'Rating', value: doctor.rating ? `${doctor.rating.toFixed(1)} / 5` : 'N/A' },
      { label: 'Fee', value: doctor.fee || 'N/A' },
    ];
  }

  selectHistoricalAppointment(appointmentId: string): void {
    const target = this.appointments.find((appointment) => appointment.id === appointmentId);
    if (!target) {
      return;
    }

    this.openDetailsPanel(target);
  }

  get dateGroupedAppointments(): AppointmentDateGroup[] {
    const map = new Map<string, Appointment[]>();

    for (const appointment of this.filteredAppointments) {
      const group = map.get(appointment.date) ?? [];
      group.push(appointment);
      map.set(appointment.date, group);
    }

    const todayKey = new Date().toISOString().split('T')[0];

    return [...map.entries()]
      .sort(([dateA], [dateB]) => {
        const timeA = new Date(`${dateA}T00:00:00`).getTime();
        const timeB = new Date(`${dateB}T00:00:00`).getTime();
        return this.sortBy === 'latest' ? timeB - timeA : timeA - timeB;
      })
      .map(([dateKey, appointments]) => ({
        dateKey,
        dateLabel: this.formatDate(dateKey),
        isToday: dateKey === todayKey,
        appointments: [...appointments].sort((a, b) => {
          const aTime = this.toDateObject(a).getTime();
          const bTime = this.toDateObject(b).getTime();
          return aTime - bTime;
        }),
      }));
  }

  get todayAppointments(): Appointment[] {
    const today = new Date();

    return this.upcomingAppointments
      .filter((appointment) => {
        const date = this.toDateObject(appointment);
        return (
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate()
        );
      })
      .sort((a, b) => this.toDateObject(a).getTime() - this.toDateObject(b).getTime())
      .slice(0, 3);
  }

  get filteredAppointments(): Appointment[] {
    const source = this.activeTab === 'upcoming' ? this.upcomingAppointments : this.pastAppointments;

    const filtered = source.filter((appointment) => {
      if (this.selectedStatus !== 'all' && appointment.status !== this.selectedStatus) {
        return false;
      }

      if (this.selectedDate && appointment.date !== this.selectedDate) {
        return false;
      }

      const query = this.searchTerm.trim().toLowerCase();
      if (query) {
        const searchIndex = [
          appointment.doctorName,
          appointment.notes,
          this.getStatusLabel(appointment.status),
          this.formatDate(appointment.date),
          this.formatTime(appointment.time),
        ]
          .join(' ')
          .toLowerCase();

        if (!searchIndex.includes(query)) {
          return false;
        }
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const aTime = this.toDateObject(a).getTime();
      const bTime = this.toDateObject(b).getTime();
      return this.sortBy === 'latest' ? bTime - aTime : aTime - bTime;
    });
  }

  isTelemedicineAppointment(appointment: Appointment): boolean {
    return String(appointment.visitType || '').trim().toUpperCase() === 'TELEMEDICINE';
  }

  showTelemedicineJoinControls(appointment: Appointment): boolean {
    return this.activeTab === 'upcoming' && this.isTelemedicineAppointment(appointment);
  }

  canJoinTelemedicineAppointment(appointment: Appointment): boolean {
    const strictScheduled = String(appointment.status || '').trim().toUpperCase() === 'SCHEDULED';
    return this.isTelemedicineAppointment(appointment) && strictScheduled && appointment.canJoin === true;
  }

  getJoinAvailableAtLabel(appointment: Appointment): string {
    const value = String(appointment.joinAvailableAt || '').trim();
    if (!value) {
      return '';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(parsed);
  }

  hasDirectMeetingUrl(appointment: Appointment): boolean {
    return !!String(appointment.meetingUrl || '').trim();
  }

  onOpenDirectMeetingUrl(appointment: Appointment): void {
    this.joinErrorMessage = '';

    const rawUrl = String(appointment.meetingUrl || '').trim();
    if (!rawUrl) {
      this.joinErrorMessage = 'Meeting URL is not available yet for this appointment.';
      return;
    }

    const opened = this.openUrlInNewTab(rawUrl);
    if (!opened) {
      this.joinErrorMessage = 'Meeting URL is invalid or blocked by the browser.';
    }
  }

  onJoinTelemedicine(appointment: Appointment): void {
    this.joinErrorMessage = '';

    if (!this.isTelemedicineAppointment(appointment)) {
      return;
    }

    const endpoint = `${this.appointmentsApiUrl}/${encodeURIComponent(appointment.id)}/telemed/join`;
    this.subscription.add(
      this.http.get<any>(endpoint).subscribe({
        next: (response) => {
          const joinUrl = String(response?.joinUrl ?? response?.url ?? '').trim();
          if (!joinUrl) {
            this.joinErrorMessage = 'Unable to open telemedicine session. Join URL is missing.';
            return;
          }

          if (!this.openUrlInNewTab(joinUrl)) {
            this.joinErrorMessage = 'Unable to open telemedicine session. Join URL is invalid.';
          }
        },
        error: (error) => {
          if (error?.status === 403) {
            this.joinErrorMessage = 'You can join 10 minutes before the appointment.';
            return;
          }

          if (error?.status === 409) {
            this.joinErrorMessage = 'This appointment is not scheduled for telemedicine.';
            return;
          }

          if (error?.status === 404) {
            this.joinErrorMessage = 'Appointment not found.';
            return;
          }

          this.joinErrorMessage = 'Unable to join appointment. Please try again.';
        },
      }),
    );
  }

  private openUrlInNewTab(rawUrl: string): boolean {
    const value = String(rawUrl || '').trim();
    if (!value) {
      return false;
    }

    const normalized = /^(https?:)?\/\//i.test(value) ? value : `https://${value}`;

    try {
      const parsed = new URL(normalized);
      const anchor = document.createElement('a');
      anchor.href = parsed.toString();
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      return true;
    } catch {
      return false;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatTime(timeString: string): string {
    if (!timeString) {
      return '--:--';
    }

    const [hours, minutes] = timeString.split(':');
    if (!hours || !minutes) {
      return timeString;
    }

    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending_doctor_confirmation':
        return '#f59e0b';
      case 'scheduled':
        return '#3b82f6';
      case 'rejected_by_doctor':
        return '#ef4444';
      case 'completed':
        return '#10b981';
      case 'cancelled':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  }

  getStatusLabel(status: AppointmentStatus): string {
    switch (status) {
      case 'pending_doctor_confirmation':
        return 'Pending';
      case 'rejected_by_doctor':
        return 'Rejected by doctor';
      case 'scheduled':
        return 'Scheduled';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return String(status);
    }
  }

  toDateObject(appointment: Appointment): Date {
    return new Date(`${appointment.date}T${this.withSeconds(appointment.time)}`);
  }

  getTypeLabel(rawType: string): string {
    const normalized = String(rawType || '').trim().toLowerCase();

    if (normalized.includes('follow')) {
      return 'Follow-up';
    }

    if (normalized.includes('emerg')) {
      return 'Emergency';
    }

    if (normalized.includes('consult')) {
      return 'Consultation';
    }

    return rawType || 'Consultation';
  }

  isAppointmentImportant(appointment: Appointment): boolean {
    return appointment.status === 'pending_doctor_confirmation' || appointment.status === 'rejected_by_doctor';
  }

  openDetailsPanel(appointment: Appointment): void {
    this.detailAppointment = { ...appointment };
    this.showDetailsPanel = true;
  }

  closeDetailsPanel(): void {
    this.showDetailsPanel = false;
    this.detailAppointment = null;
  }

  openPreconsultationForm(appointment: Appointment): void {
    void this.router.navigate(['/patient/preconsultation', appointment.id]);
  }

  openEditModal(appointment: Appointment): void {
    this.openActionModal('edit', appointment);
  }

  openPostponeModal(appointment: Appointment): void {
    this.openActionModal('postpone', appointment);
  }

  openDeleteModal(appointment: Appointment): void {
    this.openActionModal('delete', appointment);
  }

  closeActionModal(): void {
    this.showActionModal = false;
    this.actionErrorMessage = '';
    this.isSubmittingAction = false;
    this.selectedAppointment = null;
    this.appointmentForm.reset();
  }

  isEditMode(): boolean {
    return this.actionMode === 'edit';
  }

  isPostponeMode(): boolean {
    return this.actionMode === 'postpone';
  }

  submitAction(): void {
    if (!this.selectedAppointment || this.isSubmittingAction) {
      return;
    }

    if (this.actionMode === 'delete') {
      this.confirmDelete();
      return;
    }

    this.submitAppointmentUpdate();
  }

  onActionDateChange(): void {
    if (!this.isPostponeMode()) {
      return;
    }

    const dateValue = String(this.appointmentForm.get('date')?.value || '').trim();
    if (!dateValue) {
      this.actionErrorMessage = '';
      return;
    }

    if (this.isWeekendDate(dateValue)) {
      this.appointmentForm.patchValue({ date: '', time: '' });
      this.actionErrorMessage = 'Doctors are unavailable on Saturdays and Sundays. Please pick a weekday.';
      return;
    }

    this.actionErrorMessage = '';
  }

  private openActionModal(mode: ActionMode, appointment: Appointment): void {
    this.actionMode = mode;
    this.selectedAppointment = { ...appointment };
    this.detailAppointment = { ...appointment };
    this.showActionModal = true;
    this.actionErrorMessage = '';

    this.appointmentForm.reset({
      date: appointment.date,
      time: appointment.time,
      notes: appointment.notes,
    });

    this.configureFormForMode(mode);
  }

  private configureFormForMode(mode: ActionMode): void {
    const dateControl = this.appointmentForm.get('date');
    const timeControl = this.appointmentForm.get('time');
    const notesControl = this.appointmentForm.get('notes');

    dateControl?.enable({ emitEvent: false });
    timeControl?.enable({ emitEvent: false });
    notesControl?.enable({ emitEvent: false });

    if (mode === 'edit') {
      dateControl?.disable({ emitEvent: false });
      timeControl?.disable({ emitEvent: false });
      return;
    }

    if (mode === 'postpone') {
      notesControl?.disable({ emitEvent: false });
      return;
    }

    dateControl?.disable({ emitEvent: false });
    timeControl?.disable({ emitEvent: false });
    notesControl?.disable({ emitEvent: false });
  }

  private submitAppointmentUpdate(): void {
    if (!this.selectedAppointment) {
      return;
    }

    const rawValues = this.appointmentForm.getRawValue();
    const updated: Appointment = {
      ...this.selectedAppointment,
      date: this.isPostponeMode() ? rawValues.date : this.selectedAppointment.date,
      time: this.isPostponeMode() ? rawValues.time : this.selectedAppointment.time,
      notes: this.isEditMode() ? rawValues.notes : this.selectedAppointment.notes,
    };

    if (this.isPostponeMode() && this.isWeekendDate(updated.date)) {
      this.actionErrorMessage = 'Doctors are unavailable on Saturdays and Sundays. Please pick a weekday.';
      return;
    }

    this.isSubmittingAction = true;
    this.actionErrorMessage = '';

    if (this.isPostponeMode()) {
      this.resolveAndSendPostpone(updated);
      return;
    }

    const payload = this.buildAppointmentPayload(updated);
    this.subscription.add(
      this.http.patch(`${this.appointmentsApiUrl}/${updated.id}`, payload).subscribe({
        next: () => {
          this.applyAppointmentUpdate(updated);
          this.closeActionModal();
        },
        error: (error) => {
          this.isSubmittingAction = false;
          this.actionErrorMessage = this.extractActionError(error, 'Unable to save changes. Please try again.');
        },
      })
    );
  }

  private confirmDelete(): void {
    if (!this.selectedAppointment) {
      return;
    }

    this.isSubmittingAction = true;
    this.actionErrorMessage = '';
    this.resolveAndSendDelete(this.selectedAppointment);
  }

  private resolveAndSendPostpone(updated: Appointment): void {
    const appointmentId = updated.id;
    if (!appointmentId || !updated.hasServerId) {
      this.isSubmittingAction = false;
      this.actionErrorMessage = 'Appointment id is missing (id/idAp). Please refresh and try again.';
      return;
    }

    const newScheduledAt = `${updated.date}T${this.withSeconds(updated.time)}`;
    this.subscription.add(
      this.appointmentService.patientPostpone(appointmentId, newScheduledAt).subscribe({
        next: () => {
          this.loadAppointments();
          this.closeActionModal();
        },
        error: (error) => {
          this.isSubmittingAction = false;
          this.actionErrorMessage = this.extractActionError(error, 'Unable to postpone appointment. Please try again.');
        },
      })
    );
  }

  private resolveAndSendDelete(appointment: Appointment): void {
    const appointmentId = appointment.id;
    if (!appointmentId || !appointment.hasServerId) {
      this.isSubmittingAction = false;
      this.actionErrorMessage = 'Appointment id is missing (id/idAp). Please refresh and try again.';
      return;
    }

    this.subscription.add(
      this.appointmentService.requestCancel(appointmentId, 'PATIENT').subscribe({
        next: () => {
          this.loadAppointments();
          this.closeActionModal();
        },
        error: (error) => {
          this.isSubmittingAction = false;
          this.actionErrorMessage = this.extractActionError(error, 'Unable to send cancellation request. Please try again.');
        },
      })
    );
  }

  private async resolveServerAppointmentId(appointment: Appointment): Promise<string | null> {
    if (appointment.hasServerId) {
      return appointment.id;
    }

    const patientIdCandidates = this.authService.getPatientEntityIdCandidates();
    const patientId = patientIdCandidates[0] ?? null;
    if (!patientId) {
      return null;
    }

    try {
      const response = await firstValueFrom(this.http.get<any>(this.appointmentsApiUrl));
      const source = this.extractAppointmentArray(response);
      const candidates: Appointment[] = [];

      for (const rawItem of source) {
        const normalized = this.normalizeAppointment(rawItem);
        if (!normalized) {
          continue;
        }

        candidates.push(normalized);

        if (
          this.matchesPatientId(normalized.patientId, patientIdCandidates) &&
          normalized.doctorId === appointment.doctorId &&
          normalized.date === appointment.date &&
          normalized.time === appointment.time
        ) {
          if (normalized.hasServerId) {
            return normalized.id;
          }

          const deepId = this.findDeepAppointmentId(rawItem, normalized.patientId, normalized.doctorId);
          if (deepId) {
            return deepId;
          }
        }
      }

      const bestFromAll = this.findBestMatchingAppointment(candidates, appointment);
      if (bestFromAll?.hasServerId) {
        return bestFromAll.id;
      }

      if (appointment.doctorId) {
        const doctorResponse = await firstValueFrom(
          this.http.get<any>(this.appointmentsApiUrl, {
            params: new HttpParams().set('idDoctor', appointment.doctorId),
          })
        );
        const doctorCandidates = this
          .normalizeAppointments(doctorResponse, patientIdCandidates)
          .filter((item) => item.doctorId === appointment.doctorId);

        const bestFromDoctor = this.findBestMatchingAppointment(doctorCandidates, appointment);
        if (bestFromDoctor?.hasServerId) {
          return bestFromDoctor.id;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private findBestMatchingAppointment(candidates: Appointment[], target: Appointment): Appointment | null {
    let best: Appointment | null = null;
    let bestScore = -1;

    for (const candidate of candidates) {
      if (!candidate.hasServerId) {
        continue;
      }

      let score = 0;
      if (candidate.patientId === target.patientId) score += 5;
      if (candidate.doctorId === target.doctorId) score += 3;
      if (candidate.status === target.status) score += 2;
      if ((candidate.notes || '').trim() === (target.notes || '').trim()) score += 1;
      if (candidate.date === target.date) score += 3;
      if (candidate.time === target.time) score += 2;

      const candidateTime = this.toTimestamp(candidate.date, candidate.time);
      const targetTime = this.toTimestamp(target.date, target.time);
      if (candidateTime !== null && targetTime !== null) {
        const diffMs = Math.abs(candidateTime - targetTime);
        if (diffMs <= 60_000) {
          score += 4;
        } else if (diffMs <= 3_600_000) {
          score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    return bestScore >= 9 ? best : null;
  }

  private toTimestamp(date: string, time: string): number | null {
    if (!date || !time) {
      return null;
    }

    const value = new Date(`${date}T${this.withSeconds(time)}`);
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return value.getTime();
  }

  private extractActionError(error: any, fallback: string): string {
    const actionLabel =
      this.actionMode === 'delete'
        ? 'send a cancellation request'
        : this.actionMode === 'postpone'
          ? 'postpone this appointment'
          : 'update this appointment';

    if (error?.status === 401) {
      this.authService.logout();
      return `Unable to ${actionLabel}. Your session has expired or is unauthorized. Please log in again.`;
    }

    if (error?.status === 404) {
      return `Unable to ${actionLabel}. The running backend does not expose a matching appointment endpoint for this action.`;
    }

    if (error?.status === 405) {
      return `Unable to ${actionLabel}. The backend rejected the request method for this appointment action.`;
    }

    return (
      error?.error?.message ||
      error?.error?.error ||
      error?.message ||
      fallback
    );
  }

  private buildAppointmentPayload(appointment: Appointment): any {
    return {
      id: appointment.id,
      idPatient: appointment.patientId,
      idDoctor: appointment.doctorId,
      date: appointment.date,
      time: appointment.time,
      notes: appointment.notes,
      status: appointment.status,
      scheduledAt: `${appointment.date}T${this.withSeconds(appointment.time)}`,
    };
  }

  private applyAppointmentUpdate(updated: Appointment): void {
    this.appointments = this.appointments.map((appointment) =>
      appointment.id === updated.id ? updated : appointment
    );

    if (this.detailAppointment?.id === updated.id) {
      this.detailAppointment = { ...updated };
    }

    this.categorizeAppointments();
  }

  private withSeconds(time: string): string {
    if (!time) {
      return '00:00:00';
    }
    return time.length === 5 ? `${time}:00` : time;
  }

  private clearAppointments(): void {
    this.appointments = [];
    this.upcomingAppointments = [];
    this.pastAppointments = [];
  }

  private isWeekendDate(dateValue: string): boolean {
    if (!dateValue) return false;
    const parsedDate = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) return false;
    const day = parsedDate.getDay();
    return day === 0 || day === 6;
  }

  private normalizeAppointments(response: any, patientIdCandidates: string[]): Appointment[] {
    const source = this.extractAppointmentArray(response);

    return source
      .map((item: any) => this.normalizeAppointment(item))
      .filter((appointment: Appointment | null): appointment is Appointment => !!appointment)
      .filter((appointment: Appointment) => this.matchesPatientId(appointment.patientId, patientIdCandidates));
  }

  private matchesPatientId(value: string, patientIdCandidates: string[]): boolean {
    const normalized = String(value ?? '').trim();
    return !!normalized && patientIdCandidates.includes(normalized);
  }

  private extractAppointmentArray(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.content)) return response.content;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.appointments)) return response.appointments;
    if (response?.appointment && Array.isArray(response.appointment)) return response.appointment;
    return [];
  }

  private normalizeAppointment(raw: any): Appointment | null {
    const base = raw?.appointment ?? raw;

    const rawPatientId = base?.idPatient ?? base?.patientId ?? base?.patient?.id;
    const rawDoctorId = base?.idDoctor ?? base?.doctorId ?? base?.doctor?.id;
    const scheduledAt = base?.scheduledAt ?? base?.dateTime ?? base?.appointmentDate;
    const dateValue = base?.date ?? (scheduledAt ? this.toDatePart(scheduledAt) : '');
    const timeValue = base?.time ?? (scheduledAt ? this.toTimePart(scheduledAt) : '');

    if (!rawPatientId || !dateValue || !timeValue) {
      return null;
    }

    const status = this.normalizeStatus(base?.status);
    const doctorId = String(rawDoctorId ?? '');
    const idInfo = this.extractAppointmentId(base, raw, rawPatientId, dateValue, timeValue);

    return {
      id: idInfo.id,
      patientId: String(rawPatientId),
      doctorId,
      doctorName: this.resolveDoctorName(base, doctorId),
      date: dateValue,
      time: timeValue,
      appointmentType: this.getTypeLabel(String(base?.type ?? base?.appointmentType ?? 'Consultation')),
      visitType: this.normalizeVisitTypeValue(
        base?.visitType ??
        base?.visit_mode ??
        base?.visitMode ??
        base?.mode ??
        base?.consultationMode ??
        base?.appointment?.visitType ??
        base?.appointment?.visit_mode ??
        base?.appointment?.visitMode ??
        base?.appointment?.mode ??
        base?.appointment?.consultationMode ??
        (base?.isTelemedicine === true || base?.appointment?.isTelemedicine === true
          ? 'TELEMEDICINE'
          : ''),
      ),
      meetingProvider: String(base?.meetingProvider ?? base?.telemedProvider ?? base?.provider ?? '').trim(),
      meetingUrl: String(base?.meetingUrl ?? base?.meetingURL ?? base?.telemedUrl ?? '').trim() || undefined,
      canJoin: String(base?.status ?? '').trim().toUpperCase() === 'SCHEDULED' && Boolean(base?.canJoin),
      joinAvailableAt: String(base?.joinAvailableAt ?? '').trim() || undefined,
      status,
      notes: base?.notes ?? base?.reason ?? base?.type ?? 'General consultation',
      hasServerId: idInfo.hasServerId,
    };
  }

  private normalizeVisitTypeValue(raw: any): string {
    const normalized = String(raw ?? '').trim().toUpperCase();
    if (!normalized) {
      return '';
    }
    if (['TELEMEDICINE', 'ONLINE', 'VIRTUAL'].includes(normalized)) {
      return 'TELEMEDICINE';
    }
    if (['IN_PERSON', 'IN-PERSON', 'IN PERSON', 'OFFLINE'].includes(normalized)) {
      return 'IN_PERSON';
    }
    return normalized;
  }

  private extractAppointmentId(base: any, raw: any, rawPatientId: any, dateValue: string, timeValue: string): { id: string; hasServerId: boolean } {
    const candidates = [
      base?.id,
      base?.idAp,
      base?.appointmentId,
      base?.idAppointment,
      base?.appointment_id,
      base?.id_appointment,
      raw?.id,
      raw?.idAp,
      raw?.appointmentId,
      raw?.idAppointment,
      raw?.appointment_id,
      raw?.id_appointment,
      raw?.appointment?.id,
      raw?.appointment?.idAp,
      raw?.appointment?.appointmentId,
      raw?.appointment?.idAppointment,
    ];

    const found = candidates
      .map((value) => (value === null || value === undefined ? '' : String(value).trim()))
      .find((value) => !!value);

    if (found) {
      return { id: found, hasServerId: true };
    }

    const deepId = this.findDeepAppointmentId(raw, String(rawPatientId ?? ''), String(base?.idDoctor ?? base?.doctorId ?? base?.doctor?.id ?? ''));
    if (deepId) {
      return { id: deepId, hasServerId: true };
    }

    return {
      id: `${rawPatientId}-${dateValue}-${timeValue}`,
      hasServerId: false,
    };
  }

  private findDeepAppointmentId(raw: any, patientId: string, doctorId: string): string | null {
    const candidates: Array<{ key: string; value: string }> = [];

    const collect = (node: any, parentKey = '', depth = 0) => {
      if (node === null || node === undefined || depth > 5) {
        return;
      }

      if (Array.isArray(node)) {
        node.forEach((item) => collect(item, parentKey, depth + 1));
        return;
      }

      if (typeof node === 'object') {
        Object.entries(node).forEach(([key, value]) => {
          const keyPath = parentKey ? `${parentKey}.${key}` : key;
          if (value !== null && value !== undefined && typeof value !== 'object') {
            const text = String(value).trim();
            if (text) {
              candidates.push({ key: keyPath.toLowerCase(), value: text });
            }
          }
          collect(value, keyPath, depth + 1);
        });
      }
    };

    collect(raw);

    const isLikelyAppointmentId = (key: string, value: string): boolean => {
      const keyHasId = key.includes('id');
      const keyHasAppointment = key.includes('appointment');
      const valueLooksUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      const valueLooksNumeric = /^\d+$/.test(value);

      if (!keyHasId) {
        return false;
      }

      if (value === patientId || value === doctorId) {
        return false;
      }

      if (keyHasAppointment && (valueLooksUuid || valueLooksNumeric)) {
        return true;
      }

      if ((key.endsWith('.id') || key.endsWith('id')) && valueLooksUuid) {
        return true;
      }

      return false;
    };

    const preferred = candidates.find((candidate) => isLikelyAppointmentId(candidate.key, candidate.value));
    if (preferred) {
      return preferred.value;
    }

    return null;
  }

  private resolveDoctorName(base: any, doctorId: string): string {
    const mappedName = doctorId ? this.doctorNameById.get(doctorId) : null;

    return (
      mappedName ||
      base?.doctorName ||
      base?.doctor?.fullName ||
      base?.doctor?.name ||
      base?.doctorFullName ||
      'Assigned doctor'
    );
  }

  private normalizeStatus(rawStatus: any): AppointmentStatus {
    const status = String(rawStatus ?? 'SCHEDULED').toLowerCase();

    if (status.includes('pending_doctor_confirmation')) {
      return 'pending_doctor_confirmation';
    }

    if (status.includes('rejected_by_doctor')) {
      return 'rejected_by_doctor';
    }

    if (status.includes('complete')) {
      return 'completed';
    }

    if (status.includes('cancel')) {
      return 'cancelled';
    }

    return 'scheduled';
  }

  private extractDoctorNameFromUserPayload(raw: any): string | null {
    if (!raw) return null;
    const base = raw?.user ?? raw;
    const firstName = String(base?.firstName || base?.firstname || '').trim();
    const lastName = String(base?.lastName || base?.lastname || '').trim();
    const full = `${firstName} ${lastName}`.trim();
    return full || base?.name || base?.displayName || base?.fullName || null;
  }

  private toDatePart(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().split('T')[0];
  }

  private toTimePart(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
