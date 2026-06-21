import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  ProfileCompletionService,
  WizardStep,
  WizardField,
} from '../../../core/services/profile-completion.service';
import { AuthService } from '../../../core/services/auth.service';
import { LAB_SERVICE_TYPES } from '../../constants/lab-service-types';

interface WeekDayOption {
  key: string;
  label: string;
}

interface DoctorDayAvailability {
  enabled: boolean;
  start: string;
  end: string;
}

const DOCTOR_WEEK_DAYS: WeekDayOption[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

@Component({
  selector: 'app-profile-wizard',
  templateUrl: './profile-wizard.component.html',
  styleUrl: './profile-wizard.component.css',
})
export class ProfileWizardComponent implements OnInit, OnChanges {
  @Output() closed = new EventEmitter<void>();
  @Input() openSession = 0;

  steps: WizardStep[] = [];
  currentStepIndex = 0;
  formData: any = {};
  isSubmitting = false;
  submitSuccess = false;
  submitError = '';
  userRole = '';
  direction: 'left' | 'right' = 'left';
  openingStartTime = '';
  openingEndTime = '';
  doctorAvailabilityError = '';
  readonly doctorWeekDays = DOCTOR_WEEK_DAYS;
  doctorAvailability: Record<string, DoctorDayAvailability> =
    this.createDefaultDoctorAvailability();

  readonly supportedTestOptions: string[] = LAB_SERVICE_TYPES;

  constructor(
    private profileService: ProfileCompletionService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.resetWizardState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['openSession'] && !changes['openSession'].firstChange) {
      this.resetWizardState();
    }
  }

  private resetWizardState(): void {
    this.userRole = this.authService.getUserRole();
    this.steps = this.profileService.getStepsForRole(this.userRole);
    this.currentStepIndex = 0;
    this.isSubmitting = false;
    this.submitSuccess = false;
    this.submitError = '';
    this.direction = 'left';
    this.openingStartTime = '';
    this.openingEndTime = '';
    this.doctorAvailabilityError = '';
    this.doctorAvailability = this.createDefaultDoctorAvailability();

    // Load existing profile data
    const profile = this.authService.getStoredUserInfo();
    this.formData = profile ? this.normalizeProfileData(profile) : {};

    // Overlay saved draft on top
    const draft = this.profileService.loadDraft();
    if (draft) {
      this.formData = this.normalizeProfileData(
        this.mergeProfileWithDraft(this.formData, draft),
      );
    }

    // Determine starting step based on missing fields
    this.currentStepIndex = this.profileService.getFirstMissingStepIndex(
      this.userRole,
      this.formData,
    );

    this.initLabOpeningHoursRange();
    this.initDoctorAvailability();
  }

  private normalizeProfileData(data: any): any {
    const normalized = { ...(data || {}) };

    // Backward compatibility: some backend payloads still expose hospital type as "type".
    if (!normalized.hospitalType && normalized.type) {
      normalized.hospitalType = normalized.type;
    }

    return normalized;
  }

  private mergeProfileWithDraft(profileData: any, draftData: any): any {
    const merged = { ...(profileData || {}) };

    for (const [key, value] of Object.entries(draftData || {})) {
      const isEmpty = value === undefined || value === null || value === '';
      if (!isEmpty) {
        merged[key] = value;
      }
    }

    return merged;
  }

  get currentStep(): WizardStep {
    return this.steps[this.currentStepIndex];
  }

  get isFirstStep(): boolean {
    return this.currentStepIndex === 0;
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === this.steps.length - 1;
  }

  get isConfirmStep(): boolean {
    return this.currentStep?.id === 'confirm';
  }

  get stepProgress(): number {
    return Math.round(((this.currentStepIndex + 1) / this.steps.length) * 100);
  }

  next(): void {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.direction = 'left';
      this.currentStepIndex++;
      this.profileService.saveDraft(this.formData);
    }
  }

  back(): void {
    if (this.currentStepIndex > 0) {
      this.direction = 'right';
      this.currentStepIndex--;
    }
  }

  goToStep(index: number): void {
    if (index <= this.currentStepIndex) {
      this.direction = index < this.currentStepIndex ? 'right' : 'left';
      this.currentStepIndex = index;
    }
  }

  isStepComplete(index: number): boolean {
    return index < this.currentStepIndex;
  }

  isStepActive(index: number): boolean {
    return index === this.currentStepIndex;
  }

  getFieldValue(key: string): any {
    return this.formData[key] ?? '';
  }

  setFieldValue(key: string, value: any): void {
    this.formData[key] = value;
  }

  isLabOpeningHoursField(field: WizardField): boolean {
    return this.userRole === 'LABO' && field.key === 'openingHours';
  }

  isLabSupportedTestsField(field: WizardField): boolean {
    return this.userRole === 'LABO' && field.key === 'supportedTests';
  }

  isDoctorAvailabilityField(field: WizardField): boolean {
    return this.userRole === 'DOCTOR' && field.key === 'availabilitySchedule';
  }

  getDoctorDayAvailability(dayKey: string): DoctorDayAvailability {
    return (
      this.doctorAvailability[dayKey] || {
        enabled: false,
        start: '09:00',
        end: '17:00',
      }
    );
  }

  onDoctorDayEnabledChange(dayKey: string, enabled: boolean): void {
    this.doctorAvailability[dayKey] = {
      ...this.getDoctorDayAvailability(dayKey),
      enabled,
    };
    this.syncDoctorAvailabilityValue();
  }

  onDoctorDayStartChange(dayKey: string, value: string): void {
    this.doctorAvailability[dayKey] = {
      ...this.getDoctorDayAvailability(dayKey),
      start: value,
    };
    this.syncDoctorAvailabilityValue();
  }

  onDoctorDayEndChange(dayKey: string, value: string): void {
    this.doctorAvailability[dayKey] = {
      ...this.getDoctorDayAvailability(dayKey),
      end: value,
    };
    this.syncDoctorAvailabilityValue();
  }

  updateOpeningHoursStart(value: string): void {
    this.openingStartTime = value;
    this.syncOpeningHoursValue();
  }

  updateOpeningHoursEnd(value: string): void {
    this.openingEndTime = value;
    this.syncOpeningHoursValue();
  }

  isFieldMissing(key: string): boolean {
    if (this.userRole === 'DOCTOR' && key === 'availabilitySchedule') {
      return !this.formData.availabilitySchedule;
    }

    const val = this.formData[key];
    return val === undefined || val === null || val === '';
  }

  isFieldInvalid(field: WizardField): boolean {
    if (this.isDoctorAvailabilityField(field)) {
      return !!this.getDoctorAvailabilityError();
    }

    const val = this.formData[field.key];
    if (field.required && (val === undefined || val === null || val === ''))
      return true;
    if (val !== undefined && val !== null && val !== '') {
      if (field.min !== undefined && Number(val) < field.min) return true;
      if (field.maxlength && String(val).length > field.maxlength) return true;
      if (field.pattern && !new RegExp(field.pattern).test(val)) return true;
    }
    return false;
  }

  getFieldError(field: WizardField): string {
    if (this.isDoctorAvailabilityField(field)) {
      return this.getDoctorAvailabilityError();
    }

    const val = this.formData[field.key];
    if (field.required && (val === undefined || val === null || val === ''))
      return `${field.label} is required`;
    if (val !== undefined && val !== null && val !== '') {
      if (field.min !== undefined && Number(val) < field.min)
        return `${field.label} must be at least ${field.min}`;
      if (field.maxlength && String(val).length > field.maxlength)
        return `${field.label} can't exceed ${field.maxlength} chars`;
      if (field.pattern && !new RegExp(field.pattern).test(val))
        return `Invalid ${field.label.toLowerCase()} format`;
    }
    return '';
  }

  /** Collect all filled fields for the confirmation step */
  get filledFields(): { label: string; value: any }[] {
    const result: { label: string; value: any }[] = [];
    for (const step of this.steps) {
      for (const field of step.fields) {
        const val = this.formData[field.key];
        if (val !== undefined && val !== null && val !== '') {
          result.push({ label: field.label, value: val });
        }
      }
    }
    return result;
  }

  /** Check if current step has all required fields filled and valid */
  get isCurrentStepValid(): boolean {
    if (this.isConfirmStep) return true;
    return this.currentStep.fields.every((f) => !this.isFieldInvalid(f));
  }

  submit(): void {
    this.isSubmitting = true;
    this.submitError = '';

    // Only extract the fields relevant to this role from formData
    const submitPayload: any = { role: this.userRole };
    for (const step of this.steps) {
      if (step.id === 'confirm') continue;
      for (const field of step.fields) {
        if (this.formData[field.key] !== undefined) {
          submitPayload[field.key] = this.formData[field.key];
        }
      }
    }

    // Preserve base inherited fields that the user might not be editing in wizard
    if (this.formData.phoneNumber)
      submitPayload.phoneNumber = this.formData.phoneNumber;
    if (this.formData.phone) submitPayload.phone = this.formData.phone;

    // Safety check - Always guarantee email comes from the definitive verified token
    // to prevent localStorage draft overlaps causing 409 Conflicts.
    const tokenData = this.authService.decodeToken();
    submitPayload.email =
      tokenData?.email ||
      this.formData.email ||
      this.authService.getStoredUserInfo()?.email ||
      (typeof tokenData?.sub === 'string' && tokenData.sub.includes('@')
        ? tokenData.sub
        : '');

    this.authService.updateProfile(submitPayload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = true;
        this.profileService.clearDraft();
        this.profileService.refreshCompletion();
        setTimeout(() => this.close(), 2000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = 'Failed to save profile. Please try again.';
        console.error('Profile update error:', err);
      },
    });
  }

  close(): void {
    this.profileService.saveDraft(this.formData);
    this.closed.emit();
  }

  private initLabOpeningHoursRange(): void {
    if (this.userRole !== 'LABO') return;

    const value = this.formData.openingHours;
    if (!value || typeof value !== 'string') return;

    const parts = value.split(' - ');
    if (parts.length !== 2) return;

    this.openingStartTime = parts[0].trim();
    this.openingEndTime = parts[1].trim();
  }

  private syncOpeningHoursValue(): void {
    if (this.openingStartTime && this.openingEndTime) {
      this.formData.openingHours = `${this.openingStartTime} - ${this.openingEndTime}`;
      return;
    }

    this.formData.openingHours = '';
  }

  private createDefaultDoctorAvailability(): Record<string, DoctorDayAvailability> {
    return this.doctorWeekDays.reduce(
      (acc, day) => {
        acc[day.key] = {
          enabled: false,
          start: '09:00',
          end: '17:00',
        };
        return acc;
      },
      {} as Record<string, DoctorDayAvailability>,
    );
  }

  private initDoctorAvailability(): void {
    if (this.userRole !== 'DOCTOR') return;

    this.doctorAvailability = this.createDefaultDoctorAvailability();
    const parsedSchedule = this.parseDoctorAvailability(this.formData.availabilitySchedule);

    for (const [day, slots] of Object.entries(parsedSchedule)) {
      if (!Array.isArray(slots) || slots.length === 0) continue;

      const sortedSlots = [...slots].sort();
      const start = sortedSlots[0];
      const end = this.addMinutes(sortedSlots[sortedSlots.length - 1], 30) ||
        sortedSlots[sortedSlots.length - 1];

      if (!this.doctorAvailability[day]) continue;
      this.doctorAvailability[day] = {
        enabled: true,
        start,
        end,
      };
    }

    this.syncDoctorAvailabilityValue();
  }

  private syncDoctorAvailabilityValue(): void {
    const error = this.getDoctorAvailabilityError();
    this.doctorAvailabilityError = error;
    this.formData.availabilitySchedule = error
      ? ''
      : JSON.stringify(this.serializeDoctorAvailability());
  }

  private getDoctorAvailabilityError(): string {
    if (this.userRole !== 'DOCTOR') return '';

    const selectedDays = this.doctorWeekDays.filter(
      (day) => this.getDoctorDayAvailability(day.key).enabled,
    );

    if (selectedDays.length === 0) {
      return 'Select at least one working day.';
    }

    for (const day of selectedDays) {
      const item = this.getDoctorDayAvailability(day.key);
      if (!item.start || !item.end) {
        return `Please set start and end time for ${day.label}.`;
      }

      const startMins = this.timeToMinutes(item.start);
      const endMins = this.timeToMinutes(item.end);

      if (startMins === null || endMins === null || endMins <= startMins) {
        return `End time must be after start time for ${day.label}.`;
      }
    }

    return '';
  }

  private serializeDoctorAvailability(): Record<string, string[]> {
    const schedule: Record<string, string[]> = {};

    for (const day of this.doctorWeekDays) {
      const item = this.getDoctorDayAvailability(day.key);
      if (!item.enabled) continue;

      const slots = this.generateSlots(item.start, item.end);
      if (slots.length > 0) {
        schedule[day.key] = slots;
      }
    }

    return schedule;
  }

  private parseDoctorAvailability(
    rawValue: unknown,
  ): Record<string, string[]> {
    if (!rawValue) return {};

    if (typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      return rawValue as Record<string, string[]>;
    }

    if (typeof rawValue !== 'string') return {};

    const trimmed = rawValue.trim();
    if (!trimmed) return {};

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, string[]>;
      }
    } catch {
      // Ignore invalid JSON and try legacy formats.
    }

    return this.parseLegacyAvailability(trimmed);
  }

  private parseLegacyAvailability(value: string): Record<string, string[]> {
    const range = value.match(
      /(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i,
    );

    if (!range) return {};

    const start = this.normalizeTimeValue(range[1]);
    const end = this.normalizeTimeValue(range[2]);
    if (!start || !end) return {};

    const isWeekdays = /mon\s*-\s*fri/i.test(value);
    const dayKeys = isWeekdays
      ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      : ['monday'];

    return dayKeys.reduce(
      (acc, day) => {
        acc[day] = this.generateSlots(start, end);
        return acc;
      },
      {} as Record<string, string[]>,
    );
  }

  private generateSlots(start: string, end: string): string[] {
    const startMins = this.timeToMinutes(start);
    const endMins = this.timeToMinutes(end);
    if (startMins === null || endMins === null || endMins <= startMins) {
      return [];
    }

    const slots: string[] = [];
    for (let current = startMins; current < endMins; current += 30) {
      slots.push(this.minutesToTime(current));
      if (slots.length > 48) break;
    }

    return slots;
  }

  private normalizeTimeValue(value: string): string | null {
    if (!value) return null;

    const text = value.trim().toUpperCase();
    const twelveHourMatch = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
    if (twelveHourMatch) {
      let hour = Number(twelveHourMatch[1]);
      const minute = Number(twelveHourMatch[2] || '00');
      const period = twelveHourMatch[3];

      if (hour < 1 || hour > 12 || minute > 59) return null;
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;

      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    const twentyFourHourMatch = text.match(/^(\d{1,2}):(\d{2})$/);
    if (!twentyFourHourMatch) return null;

    const hour = Number(twentyFourHourMatch[1]);
    const minute = Number(twentyFourHourMatch[2]);
    if (hour > 23 || minute > 59) return null;

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  private timeToMinutes(value: string): number | null {
    const normalized = this.normalizeTimeValue(value);
    if (!normalized) return null;

    const [hour, minute] = normalized.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

    return hour * 60 + minute;
  }

  private minutesToTime(totalMinutes: number): string {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  private addMinutes(value: string, amount: number): string | null {
    const mins = this.timeToMinutes(value);
    if (mins === null) return null;
    return this.minutesToTime(mins + amount);
  }
}
