import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  CreateConsultationRequest,
  DmrService,
  MedicalCaseDetailItem,
  MedicalCaseResponse,
} from '../../../../core/services/dmr.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PatientCacheService } from '../../services/patient-cache.service';

interface ConsultationItem {
  id?: string;
  date: string;
  notes: string;
}

@Component({
  selector: 'app-consultation-tab',
  templateUrl: './consultation-tab.component.html',
  styleUrl: './consultation-tab.component.css',
})
export class ConsultationTabComponent implements OnInit, OnChanges, OnDestroy {
  @Input() patientId: string | null = null;
  @Input() caseId: string | null = null;

  consultationDate = '';
  consultationNotes = '';
  consultations: ConsultationItem[] = [];
  loading = false;
  submitting = false;
  errorMessage = '';
  consultationDateTouched = false;
  consultationNotesTouched = false;
  private readonly consultationNotesMinLength = 10;
  private readonly notesMaxLength = 1000;

  private doctorId = '';
  medicalCaseId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private dmrService: DmrService,
    private authService: AuthService,
    private patientCacheService: PatientCacheService,
  ) {}

  ngOnInit(): void {
    this.doctorId = this.authService.getUserIdAsString() || '';
    this.initializeCurrentDateTime();
    this.medicalCaseId = this.caseId;

    this.patientCacheService.workspace$
      .pipe(takeUntil(this.destroy$))
      .subscribe((workspaceData) => {
        if (!workspaceData) {
          return;
        }

        const activeCaseId = this.caseId || this.medicalCaseId;
        if (
          activeCaseId &&
          workspaceData.caseDetails?.medicalCaseId === activeCaseId
        ) {
          this.medicalCaseId = activeCaseId;
          this.consultations = workspaceData.consultations || [];
          this.loading = false;
        }
      });

    if (this.patientId) {
      this.patientCacheService
        .selectPatient(this.patientId)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }

    this.reloadFromBackend();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientId'] && !changes['patientId'].firstChange) {
      this.patientCacheService
        .selectPatient(this.patientId!)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
      this.reloadFromBackend();
    }

    if (changes['caseId'] && !changes['caseId'].firstChange) {
      this.medicalCaseId = this.caseId;
      if (this.medicalCaseId) {
        this.loadConsultations(this.medicalCaseId);
      } else {
        this.reloadFromBackend();
      }
    }
  }

  addConsultation(): void {
    if (!this.canSubmitConsultation) {
      this.errorMessage = 'Please fix the highlighted consultation fields.';
      return;
    }

    const nowDateTime = this.buildCurrentDateTimeValue();
    this.consultationDate = nowDateTime;

    const normalizedNotes = this.normalizeFreeText(
      this.consultationNotes,
      this.notesMaxLength,
    );
    const consultationDateValue = this.toApiDateTime(nowDateTime);

    if (
      !this.medicalCaseId ||
      !this.doctorId ||
      !consultationDateValue ||
      !normalizedNotes
    ) {
      if (!consultationDateValue) {
        this.errorMessage = 'Please provide a valid consultation date.';
      }
      return;
    }

    this.consultationNotes = normalizedNotes;

    const payload: CreateConsultationRequest = {
      doctorId: this.doctorId,
      consultationDate: consultationDateValue,
      notes: normalizedNotes,
    };

    this.submitting = true;
    this.errorMessage = '';

    this.dmrService.createConsultation(this.medicalCaseId, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.consultationNotes = '';
        this.initializeCurrentDateTime();
        this.resetValidationState();
        this.errorMessage = '';
        this.refreshMedicalCases();
        this.loadConsultations(this.medicalCaseId!);
      },
      error: () => {
        this.errorMessage = 'Could not save consultation.';
        this.submitting = false;
      },
    });
  }

  deleteConsultation(id: string): void {
    if (!id || !this.doctorId) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.dmrService.deleteConsultation(id, this.doctorId).subscribe({
      next: () => {
        this.submitting = false;
        this.refreshMedicalCases();
        if (this.medicalCaseId) {
          this.loadConsultations(this.medicalCaseId);
        }
      },
      error: () => {
        this.errorMessage = 'Could not delete consultation.';
        this.submitting = false;
      },
    });
  }

  private reloadFromBackend(): void {
    if (!this.patientId) {
      this.consultations = [];
      this.medicalCaseId = null;
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.dmrService.getPatientMedicalCases(this.patientId).subscribe({
      next: (cases: MedicalCaseResponse[]) => {
        this.medicalCaseId = this.resolveMedicalCaseId(cases);
        if (!this.medicalCaseId) {
          this.consultations = [];
          this.loading = false;
          return;
        }
        this.loadConsultations(this.medicalCaseId);
      },
      error: () => {
        this.errorMessage = 'Could not load patient medical cases.';
        this.loading = false;
      },
    });
  }

  private loadConsultations(medicalCaseId: string): void {
    this.loading = true;
    this.dmrService.getMedicalCaseDetails(medicalCaseId).subscribe({
      next: (details) => {
        const entries = details.details || [];
        this.consultations = entries
          .filter((item: MedicalCaseDetailItem) => item.type === 'consultation')
          .map((item: MedicalCaseDetailItem) => ({
            id: item.id,
            date: item.date || '',
            notes: item.additionalInfo || item.name || 'Consultation',
          }))
          .sort(
            (a, b) =>
              new Date(b.date || '').getTime() -
              new Date(a.date || '').getTime(),
          );
        this.patientCacheService.updateConsultations(this.consultations);
        this.patientCacheService.updateCaseDetails(details);
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load consultations.';
        this.loading = false;
      },
    });
  }

  private findLatestMedicalCaseId(cases: MedicalCaseResponse[]): string | null {
    if (!cases.length) {
      return null;
    }

    const sortedCases = [...cases].sort(
      (a, b) =>
        new Date(b.createdAt || b.startDate || '').getTime() -
        new Date(a.createdAt || a.startDate || '').getTime(),
    );

    return sortedCases[0]?.id || null;
  }

  private resolveMedicalCaseId(cases: MedicalCaseResponse[]): string | null {
    const selectedCaseId = this.caseId;
    if (
      selectedCaseId &&
      cases.some((caseItem) => caseItem.id === selectedCaseId)
    ) {
      return selectedCaseId;
    }

    return this.findLatestMedicalCaseId(cases);
  }

  get consultationDateError(): string {
    if (!this.consultationDate) {
      return 'Consultation date and time is required.';
    }

    const parsed = this.toApiDateTime(this.consultationDate);
    return parsed ? '' : 'Please enter a valid consultation date and time.';
  }

  get consultationNotesError(): string {
    const normalized = this.normalizeFreeText(
      this.consultationNotes,
      this.notesMaxLength,
    );

    if (!normalized) {
      return `Notes are required (minimum ${this.consultationNotesMinLength} characters).`;
    }

    if (normalized.length < this.consultationNotesMinLength) {
      return `Consultation notes must contain at least ${this.consultationNotesMinLength} characters.`;
    }

    return '';
  }

  get canSubmitConsultation(): boolean {
    return (
      !this.submitting &&
      !!this.medicalCaseId &&
      !!this.doctorId &&
      !this.consultationNotesError
    );
  }

  markConsultationNotesTouched(): void {
    this.consultationNotesTouched = true;
  }

  private resetValidationState(): void {
    this.consultationNotesTouched = false;
  }

  private initializeCurrentDateTime(): void {
    this.consultationDate = this.buildCurrentDateTimeValue();
  }

  private buildCurrentDateTimeValue(): string {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
  }

  private refreshMedicalCases(): void {
    if (!this.patientId) {
      return;
    }

    this.dmrService.getPatientMedicalCases(this.patientId).subscribe({
      next: (cases: MedicalCaseResponse[]) => {
        this.patientCacheService.updateMedicalCases(cases || []);
      },
    });
  }

  private normalizeFreeText(value: string, maxLength: number): string {
    const normalized = (value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '';
    }
    return normalized.slice(0, maxLength);
  }

  private toApiDateTime(dateValue: string): string | null {
    if (!dateValue) {
      return null;
    }

    const parsed = new Date(dateValue);
    if (!Number.isFinite(parsed.getTime())) {
      return null;
    }

    const [datePart, timePart] = dateValue.split('T');
    if (!datePart || !timePart) {
      return null;
    }

    const normalizedTime = timePart.length === 5 ? `${timePart}:00` : timePart;
    return `${datePart}T${normalizedTime}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
