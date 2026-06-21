import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Doctor } from '../../core/services/doctor.service';

@Component({
  selector: 'app-appointment',
  standalone: false,
  templateUrl: './appointment.component.html',
  styleUrls: ['./appointment.component.css']
})
export class AppointmentComponent implements OnInit {
  private readonly appointmentsApiUrl = '/api/v1/appointments';
  private readonly doctorsApiUrl = '/api/v1/doctors';

  readonly appointmentTypes = [
    { value: 'consultation', label: 'Consultation' },
    { value: 'follow-up', label: 'Follow-up' },
    { value: 'emergency', label: 'Emergency' }
  ];

  readonly visitModes = [
    { value: 'in_person', label: 'In Person' },
    { value: 'telemedicine', label: 'Online (Telemedicine)' }
  ];

  isLoading = false;
  selectedDoctor: Doctor | null = null;
  weekendDateError = '';
  noSlotsMessage = '';
  
  availableTimeSlots: string[] = [];
  availableDates: Set<string> = new Set();
  loadingSlots = false;

  formData = {
    date: '',
    time: '',
    visitMode: '',
    type: '',
    scheduledAt: ''
  };

  toast = {
    visible: false,
    message: '',
    variant: 'success' as 'success' | 'error'
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const navState = (history.state ?? {}) as { preSelectedDoctor?: Doctor };
    this.selectedDoctor = navState.preSelectedDoctor ?? null;
    
    if (this.selectedDoctor?.id) {
      this.loadAvailableDates();
    }
  }

  onSubmit(): void {
    if (!this.isFormValid || this.isLoading) {
      return;
    }

    if (!this.selectedDoctor || !this.selectedDoctor.id) {
      this.openToast('Please select a doctor first. Go back and click "Book Now" on a doctor.', 'error');
      return;
    }

    if (this.isWeekend(this.formData.date)) {
      this.weekendDateError = 'Doctors are unavailable on Saturdays and Sundays. Please pick a weekday.';
      return;
    }

    this.isLoading = true;

    const patientId = this.authService.getPatientEntityId();
    console.log('Current patient entity ID:', patientId);

    if (!patientId) {
      console.error('Patient entity ID not found. Profile may be incomplete or invalid.');
      alert('Unable to identify patient. Please log in again.');
      this.isLoading = false;
      return;
    }

    const normalizedType = this.normalizeAppointmentType(this.formData.type);
    const normalizedVisitType = this.normalizeVisitType(this.formData.visitMode);
    const isTelemedicine = normalizedVisitType === 'TELEMEDICINE';
    const scheduledAt = this.buildScheduledAt(this.formData.date, this.formData.time);
    this.formData.scheduledAt = scheduledAt;

    const appointmentData = {
      createdByRole: 'PATIENT',
      visitType: normalizedVisitType,
      visit_mode: normalizedVisitType,
      mode: normalizedVisitType,
      consultationMode: normalizedVisitType,
      isTelemedicine,
      appointment: {
        idPatient: patientId,
        idDoctor: String(this.selectedDoctor!.id),
        type: normalizedType,
        visitType: normalizedVisitType,
        visit_mode: normalizedVisitType,
        mode: normalizedVisitType,
        consultationMode: normalizedVisitType,
        isTelemedicine,
        status: 'PENDING_DOCTOR_CONFIRMATION',
        scheduledAt
      }
    };

    console.log('Appointment data sending:', appointmentData);

    this.http.post<any>(this.appointmentsApiUrl, appointmentData).subscribe({
      next: (response) => {
        const appointmentId = this.extractAppointmentId(response);

        this.openToast('Request submitted. Pending doctor approval.', 'success');
        this.isLoading = false;
        this.resetForm();

        if (appointmentId) {
          void this.router.navigate(['/patient/preconsultation', appointmentId]);
        } else {
          void this.router.navigate(['/patient/appointments']);
        }
      },
      error: (error) => {
        console.error('Error creating appointment:', error);
        const backendMessage =
          error?.error?.message ||
          error?.error?.error ||
          error?.error?.details ||
          null;

        const errorMessage = this.getCreateAppointmentErrorMessage(error?.status, backendMessage);

        this.openToast(errorMessage, 'error');
        this.isLoading = false;
      }
    });
  }

  selectTimeSlot(slot: string): void {
    this.formData.time = slot;
  }

  onDateChange(): void {
    if (!this.formData.date) {
      this.weekendDateError = '';
      this.availableTimeSlots = [];
      this.noSlotsMessage = '';
      return;
    }

    // Check if date is in available dates (if list is populated)
    if (this.availableDates.size > 0 && !this.availableDates.has(this.formData.date)) {
      this.formData.date = '';
      this.formData.time = '';
      this.weekendDateError = 'This date is not available. Please select another date.';
      this.availableTimeSlots = [];
      this.noSlotsMessage = '';
      this.openToast(this.weekendDateError, 'error');
      return;
    }

    if (this.isWeekend(this.formData.date)) {
      this.formData.date = '';
      this.formData.time = '';
      this.weekendDateError = 'Doctors are unavailable on Saturdays and Sundays. Please pick a weekday.';
      this.availableTimeSlots = [];
      this.noSlotsMessage = '';
      this.openToast(this.weekendDateError, 'error');
      return;
    }

    this.weekendDateError = '';
    this.formData.time = '';
    this.loadAvailableSlots(this.formData.date);
  }



  private loadAvailableDates(): void {
    if (!this.selectedDoctor?.id) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    this.http
      .get<any>(
        `${this.doctorsApiUrl}/${encodeURIComponent(String(this.selectedDoctor.id))}/available-dates?year=${year}&month=${month}`
      )
      .subscribe({
        next: (response) => {
          const dates = response?.availableDates ?? response?.dates ?? response ?? [];
          this.availableDates = new Set(Array.isArray(dates) ? dates : []);
          console.log('Available dates loaded:', this.availableDates);
        },
        error: (error) => {
          console.error('Error loading available dates:', error);
          this.availableDates.clear();
        }
      });
  }

  private loadAvailableSlots(date: string): void {
    if (!this.selectedDoctor?.id || !date) return;

    this.loadingSlots = true;
    this.noSlotsMessage = '';

    this.http
      .get<any>(
        `${this.doctorsApiUrl}/${encodeURIComponent(String(this.selectedDoctor.id))}/available-slots?date=${date}`
      )
      .subscribe({
        next: (response) => {
          const slots = response?.availableSlots ?? response?.slots ?? response ?? [];
          this.availableTimeSlots = Array.isArray(slots) ? slots : [];

          if (this.availableTimeSlots.length === 0) {
            this.noSlotsMessage = 'No slots available for this date.';
          }

          console.log('Available slots for', date, ':', this.availableTimeSlots);
          this.loadingSlots = false;
        },
        error: (error) => {
          console.error('Error loading available slots:', error);
          this.availableTimeSlots = [];
          this.noSlotsMessage = 'Unable to load available slots. Please try again.';
          this.loadingSlots = false;
        }
      });
  }

  get isFormValid(): boolean {
    const dateAvailable = this.availableDates.size === 0 || this.availableDates.has(this.formData.date);
    return (
      !!this.selectedDoctor &&
      !!this.selectedDoctor.id &&
      !!this.formData.date &&
      dateAvailable &&
      !!this.formData.time &&
      !!this.formData.visitMode &&
      !!this.formData.type &&
      !this.isWeekend(this.formData.date)
    );
  }

  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private buildScheduledAt(date: string, time: string): string {
    return new Date(`${date}T${time}:00`).toISOString();
  }

  private normalizeAppointmentType(rawType: string): string {
    if (!rawType) {
      return rawType;
    }

    const normalized = rawType.trim().toLowerCase();

    switch (normalized) {
      case 'consultation':
        return 'CONSULTATION';
      case 'follow-up':
      case 'follow_up':
      case 'followup':
        return 'FOLLOW_UP';
      case 'emergency':
        return 'EMERGENCY';
      default:
        return rawType;
    }
  }

  private normalizeVisitType(rawVisitType: string): string {
    const normalized = String(rawVisitType || '').trim().toLowerCase();
    if (normalized === 'telemedicine' || normalized === 'online' || normalized === 'virtual') {
      return 'TELEMEDICINE';
    }
    if (normalized === 'in_person' || normalized === 'in-person' || normalized === 'in person') {
      return 'IN_PERSON';
    }
    return 'IN_PERSON';
  }

  private getCreateAppointmentErrorMessage(status: number | undefined, backendMessage: string | null): string {
    const normalizedMessage = String(backendMessage || '').trim().toLowerCase();

    if (
      status === 400 &&
      normalizedMessage.includes('meetingurl') &&
      normalizedMessage.includes('required') &&
      normalizedMessage.includes('telemedicine')
    ) {
      return 'The appointment service on port 8081 is still running the old telemedicine validation. Restart the updated appointment-service, then try again.';
    }

    if (status === 400) {
      return backendMessage
        ? `Invalid appointment data: ${backendMessage}`
        : 'Invalid appointment data. Please check your input.';
    }

    return backendMessage
      ? `Failed to create appointment: ${backendMessage}`
      : 'Failed to create appointment. Please try again.';
  }

  private openToast(message: string, variant: 'success' | 'error'): void {
    this.toast = {
      visible: true,
      message,
      variant
    };

    setTimeout(() => {
      this.toast.visible = false;
    }, 2800);
  }

  getSubmitButtonText(): string {
    return this.isLoading ? 'Booking...' : 'Confirm Appointment';
  }

  resetForm(): void {
    this.formData = { date: '', time: '', visitMode: '', type: '', scheduledAt: '' };
    this.weekendDateError = '';
  }

  private isWeekend(date: string): boolean {
    if (!date) return false;
    const parsedDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) return false;
    const day = parsedDate.getDay();
    return day === 0 || day === 6;
  }

  private extractAppointmentId(response: any): string | null {
    const source = response?.appointment ?? response?.data ?? response;
    const id = source?.id ?? source?.appointmentId ?? source?.appointment?.id;
    return id != null ? String(id) : null;
  }
}
