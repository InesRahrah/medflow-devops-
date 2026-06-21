import { Component, EventEmitter, Output, Input, OnDestroy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppointmentService, Appointment } from '../../../core/services/appointment.service';
import { DoctorService, DoctorPatient } from '../../../core/services/doctor.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

type ModalPatient = {
  id: number | string;
  name: string;
};

@Component({
  selector: 'app-appointment-modal',
  templateUrl: './appointment-modal.component.html',
  styleUrls: ['./appointment-modal.component.css']
})
export class AppointmentModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() selectedDate: Date | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() appointmentCreated = new EventEmitter<Appointment>();

  appointmentForm: FormGroup;
  patients: ModalPatient[] = [];
  filteredPatients: ModalPatient[] = [];
  availableTimes: string[] = [];
  showPatientSuggestions = false;
  isLoading = false;
  isSlotsLoading = false;
  errorMessage = '';
  private doctorIdCandidates: string[] = [];
  private readonly destroy$ = new Subject<void>();
  private readonly patientSearch$ = new Subject<string>();

  private timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  constructor(
    private fb: FormBuilder,
    private appointmentService: AppointmentService,
    private doctorService: DoctorService,
    private authService: AuthService,
    private notificationService: NotificationService,
  ) {
    this.appointmentForm = this.fb.group({
      patientName: ['', [Validators.required]],
      patientId: [''],
      date: ['', Validators.required],
      time: ['', Validators.required],
      appointmentType: ['consultation', Validators.required],
      reason: ['', [Validators.required, Validators.minLength(5)]],
      followUpNotes: ['']
    });
  }

  ngOnInit(): void {
    this.patientSearch$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => this.filterPatients(query));

    this.appointmentForm
      .get('appointmentType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (value !== 'follow-up') {
          this.appointmentForm.patchValue({ followUpNotes: '' }, { emitEvent: false });
        }
      });

    this.doctorIdCandidates = this.resolveDoctorIdCandidates();
    this.loadPatients();
    if (this.selectedDate) {
      this.appointmentForm.patchValue({
        date: this.selectedDate.toISOString().split('T')[0]
      });
      this.updateAvailableTimes();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.errorMessage = '';
      this.showPatientSuggestions = false;
      this.filteredPatients = [...this.patients];
    }

    if (this.selectedDate && this.isOpen) {
      this.appointmentForm.patchValue({
        date: this.selectedDate.toISOString().split('T')[0]
      });
      this.updateAvailableTimes();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPatients(): void {
    this.doctorService
      .getMyDoctorId()
      .pipe(takeUntil(this.destroy$))
      .subscribe((numericId) => {
        if (numericId) {
          this.doctorIdCandidates = this.doctorService.prependDoctorEntityIdCandidates(this.doctorIdCandidates, numericId);
        }

        this.authService
          .getProfile()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (profile: any) => {
              const extraFromProfile = this.doctorService.getDoctorEntityIdCandidatesFromProfile(profile);

              if (extraFromProfile.length > 0) {
                this.doctorIdCandidates = this.doctorService.prependDoctorEntityIdCandidates(
                  this.doctorIdCandidates,
                  ...extraFromProfile,
                );
              }

              if (this.doctorIdCandidates.length > 0) {
                this.tryLoadDoctorPatients(0);
              } else {
                this.showPatientLoadError();
              }
            },
            error: () => {
              if (this.doctorIdCandidates.length > 0) {
                this.tryLoadDoctorPatients(0);
              } else {
                this.showPatientLoadError();
              }
            },
          });
      });
  }

  private tryLoadDoctorPatients(candidateIndex: number): void {
    const candidateId = this.doctorIdCandidates[candidateIndex];
    if (!candidateId) {
      this.showPatientLoadError();
      return;
    }

    this.doctorService
      .getDoctorPatients(candidateId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (doctorPatients: DoctorPatient[]) => {
          const normalizedPatients = this.normalizeDoctorPatients(doctorPatients);

          if (normalizedPatients.length === 0 && candidateIndex < this.doctorIdCandidates.length - 1) {
            this.tryLoadDoctorPatients(candidateIndex + 1);
            return;
          }

          if (normalizedPatients.length === 0) {
            this.showPatientLoadError();
            return;
          }

          this.patients = normalizedPatients;
          this.filteredPatients = [...normalizedPatients];
          this.errorMessage = '';
        },
        error: () => {
          if (candidateIndex < this.doctorIdCandidates.length - 1) {
            this.tryLoadDoctorPatients(candidateIndex + 1);
            return;
          }

          this.showPatientLoadError();
        },
      });
  }

  private showPatientLoadError(): void {
    this.errorMessage = 'Unable to load your real patient list right now. Please try again.';
    this.patients = [];
    this.filteredPatients = [];
  }

  private normalizeDoctorPatients(doctorPatients: DoctorPatient[]): ModalPatient[] {
    const uniqueByName = new Set<string>();
    const normalized: ModalPatient[] = [];

    for (const patient of doctorPatients || []) {
      const name = String(patient?.name || '').trim();
      const id = patient?.id;
      if (!name || id == null) {
        continue;
      }

      const key = name.toLowerCase();
      if (uniqueByName.has(key)) {
        continue;
      }

      uniqueByName.add(key);
      normalized.push({ id, name });
    }

    return normalized.sort((a, b) => a.name.localeCompare(b.name));
  }

  updateAvailableTimes(): void {
    const date = this.appointmentForm.value.date;
    const doctorId = this.doctorIdCandidates[0] ?? null;
    
    if (!date || !doctorId) {
      this.availableTimes = [];
      return;
    }

    this.isSlotsLoading = true;
    this.appointmentService.getDoctorAvailableSlots(doctorId, date)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (slots) => {
          this.availableTimes = slots;
          this.isSlotsLoading = false;
        },
        error: (err) => {
          console.error('Error fetching slots:', err);
          this.availableTimes = [];
          this.isSlotsLoading = false;
        }
      });
  }

  onDateChange(): void {
    this.updateAvailableTimes();
    this.appointmentForm.patchValue({ time: '' });
  }

  onPatientInput(): void {
    const patientName = String(this.appointmentForm.get('patientName')?.value ?? '').trim();
    this.appointmentForm.patchValue({ patientId: '' }, { emitEvent: false });
    this.patientSearch$.next(patientName);
    this.showPatientSuggestions = true;
  }

  onPatientFocus(): void {
    const patientName = String(this.appointmentForm.get('patientName')?.value ?? '').trim();
    this.patientSearch$.next(patientName);
    this.showPatientSuggestions = true;
  }

  onPatientBlur(): void {
    window.setTimeout(() => {
      this.showPatientSuggestions = false;
      this.syncSelectedPatientFromInput();
    }, 100);
  }

  selectPatient(patient: ModalPatient): void {
    this.appointmentForm.patchValue({
      patientName: patient.name,
      patientId: String(patient.id),
    });

    const patientNameControl = this.appointmentForm.get('patientName');
    const errors = patientNameControl?.errors;
    if (errors?.['patientNotFound']) {
      delete errors['patientNotFound'];
      patientNameControl?.setErrors(Object.keys(errors).length ? errors : null);
    }

    this.showPatientSuggestions = false;
  }

  private filterPatients(query: string): void {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    if (!normalizedQuery) {
      this.filteredPatients = [...this.patients];
      return;
    }

    this.filteredPatients = this.patients.filter((patient) =>
      String(patient.name || '').toLowerCase().includes(normalizedQuery),
    );
  }

  private syncSelectedPatientFromInput(): ModalPatient | undefined {
    const patientNameControl = this.appointmentForm.get('patientName');
    if (!patientNameControl) {
      this.appointmentForm.patchValue({ patientId: '' }, { emitEvent: false });
      return undefined;
    }

    const patientName = String(patientNameControl?.value ?? '').trim();

    if (!patientName) {
      this.appointmentForm.patchValue({ patientId: '' }, { emitEvent: false });
      return undefined;
    }

    const matchedPatient = this.patients.find(
      (patient) => String(patient.name || '').trim().toLowerCase() === patientName.toLowerCase(),
    );

    if (!matchedPatient) {
      this.appointmentForm.patchValue({ patientId: '' }, { emitEvent: false });
      patientNameControl?.setErrors({ ...(patientNameControl.errors || {}), patientNotFound: true });
      return undefined;
    }

    this.appointmentForm.patchValue({ patientId: String(matchedPatient.id) }, { emitEvent: false });

    const errors = patientNameControl.errors;
    if (errors?.['patientNotFound']) {
      delete errors['patientNotFound'];
      patientNameControl.setErrors(Object.keys(errors).length ? errors : null);
    }

    return matchedPatient;
  }

  checkTimeAvailability(): void {
    const { date, time } = this.appointmentForm.value;
    if (!date || !time) return;

    this.appointmentService.checkTimeSlotAvailability(1, date, time).subscribe({
      next: (isAvailable: boolean) => {
        if (!isAvailable) {
          this.appointmentForm.get('time')?.setErrors({ timeTaken: true });
        } else {
          const timeControl = this.appointmentForm.get('time');
          const errors = timeControl?.errors;
          if (errors?.['timeTaken']) {
            delete errors['timeTaken'];
            timeControl?.setErrors(Object.keys(errors).length ? errors : null);
          }
        }
      },
      error: (error: any) => {
        console.error('Error checking time availability:', error);
      }
    });
  }

  onSubmit(): void {
    const selectedPatient = this.syncSelectedPatientFromInput();
    const doctorId = this.doctorIdCandidates[0] ?? null;

    if (!this.appointmentForm.valid || !selectedPatient) {
      Object.keys(this.appointmentForm.controls).forEach(key => {
        this.appointmentForm.get(key)?.markAsTouched();
      });
      if (!selectedPatient) {
        this.errorMessage = 'Please select an existing patient from your patient list.';
      }
      return;
    }

    if (!doctorId) {
      this.errorMessage = 'Unable to resolve doctor account. Please re-login and try again.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formValue = this.appointmentForm.value;
    const appointmentType = String(formValue.appointmentType || 'consultation');
    const typeLabel = appointmentType === 'follow-up' ? 'Follow-up' : 'Consultation';

    const notesParts = [`${typeLabel}: ${String(formValue.reason || '').trim()}`];
    if (appointmentType === 'follow-up' && String(formValue.followUpNotes || '').trim()) {
      notesParts.push(`Next appointment notes: ${String(formValue.followUpNotes || '').trim()}`);
    }

    const appointmentData = {
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      doctorId,
      doctorName: this.authService.getUserFirstName() || 'Doctor',
      date: formValue.date,
      time: formValue.time,
      status: 'scheduled' as const,
      notes: notesParts.join('\n')
    };

    this.appointmentService.createAppointment(appointmentData).subscribe({
      next: (appointment: Appointment) => {
        this.isLoading = false;
        this.appointmentCreated.emit(appointment);
        window.setTimeout(() => this.notificationService.refreshNow(), 2000);
        this.close();
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to create appointment.';
        console.error('Error creating appointment:', error);
      }
    });
  }

  close(): void {
    this.isOpen = false;
    this.appointmentForm.reset();
    this.appointmentForm.patchValue({ appointmentType: 'consultation' }, { emitEvent: false });
    this.filteredPatients = [...this.patients];
    this.showPatientSuggestions = false;
    this.errorMessage = '';
    this.closeModal.emit();
  }

  getMinDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  get isFollowUpSelected(): boolean {
    return this.appointmentForm.get('appointmentType')?.value === 'follow-up';
  }

  private resolveDoctorIdCandidates(): string[] {
    return this.doctorService.getStoredDoctorEntityIdCandidates();
  }

  get timeOptions() {
    return this.availableTimes.map(t => ({
      label: this.formatTime(t),
      value: t
    }));
  }
}
