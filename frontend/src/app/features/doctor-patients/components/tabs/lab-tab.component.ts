import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import {
  CreateLabRequestRequest,
  DmrService,
  MedicalCaseDetailItem,
  MedicalCaseResponse,
} from '../../../../core/services/dmr.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LAB_SERVICE_TYPE_OPTIONS } from '../../constants/lab-service-types';
import {
  BodyScanLayer,
  buildLabRequestNotes,
  isImagingLabServiceType,
  sanitizeLabScanSelection,
} from '../../../../shared/utils/lab-scan-metadata';

interface LabRequestItem {
  id?: string;
  type: string;
  date: string;
  notes: string;
}

@Component({
  selector: 'app-lab-tab',
  templateUrl: './lab-tab.component.html',
  styleUrl: './lab-tab.component.css',
})
export class LabTabComponent implements OnInit, OnChanges {
  @Input() patientId: string | null = null;
  @Input() caseId: string | null = null;

  testType = '';
  labDate = '';
  labNotes = '';
  labRequests: LabRequestItem[] = [];
  loading = false;
  submitting = false;
  errorMessage = '';
  showScanSelectorModal = false;
  scanSelectedPartIds: string[] = [];
  scanActiveLayers: BodyScanLayer[] = ['surface'];
  testTypeTouched = false;
  labDateTouched = false;
  labNotesTouched = false;
  scanSelectionTouched = false;
  private readonly labNotesMinLength = 3;
  private readonly testTypeMaxLength = 80;
  private readonly notesMaxLength = 1000;

  testTypeOptions = LAB_SERVICE_TYPE_OPTIONS;

  private doctorId = '';
  medicalCaseId: string | null = null;

  constructor(
    private dmrService: DmrService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.doctorId = this.authService.getUserIdAsString() || '';
    this.initializeTodayDate();
    this.reloadFromBackend();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientId'] && !changes['patientId'].firstChange) {
      this.reloadFromBackend();
    }

    if (changes['caseId'] && !changes['caseId'].firstChange) {
      this.medicalCaseId = this.caseId;
      if (this.medicalCaseId) {
        this.loadLabRequests(this.medicalCaseId);
      } else {
        this.reloadFromBackend();
      }
    }
  }

  addLabRequest(): void {
    if (!this.canSubmitLab) {
      this.errorMessage = 'Please fix the highlighted lab fields.';
      return;
    }

    const normalizedType = this.normalizeFreeText(
      this.testType,
      this.testTypeMaxLength,
    );
    const autoDate = this.buildCurrentDateValue();
    this.labDate = autoDate;
    const normalizedNotes = this.normalizeFreeText(
      this.labNotes,
      this.notesMaxLength,
    );
    const normalizedRequestedDate = autoDate;

    if (!this.medicalCaseId || !this.doctorId || !normalizedType) {
      this.errorMessage = 'Please choose a service type.';
      return;
    }

    if (
      this.shouldShowBodyScanSelector &&
      this.scanSelectedPartIds.length === 0
    ) {
      this.scanSelectionTouched = true;
      this.showScanSelectorModal = true;
      this.errorMessage =
        'Select at least one body area for this custom scan request.';
      return;
    }

    this.testType = normalizedType;
    this.labNotes = normalizedNotes;

    const formattedNotes = normalizedRequestedDate
      ? `Requested date: ${normalizedRequestedDate}${normalizedNotes ? `\n${normalizedNotes}` : ''}`
      : normalizedNotes;

    const scanSelection = this.shouldShowBodyScanSelector
      ? sanitizeLabScanSelection({
          selectedPartIds: this.scanSelectedPartIds,
          activeLayers: this.scanActiveLayers,
        })
      : null;

    if (this.shouldShowBodyScanSelector && !scanSelection) {
      this.scanSelectionTouched = true;
      this.showScanSelectorModal = true;
      this.errorMessage =
        'Select at least one body area for this custom scan request.';
      return;
    }

    const payload: CreateLabRequestRequest = {
      doctorId: this.doctorId,
      testType: normalizedType,
      notes: buildLabRequestNotes(formattedNotes, scanSelection),
    };

    this.submitting = true;
    this.errorMessage = '';

    this.dmrService.createLabRequest(this.medicalCaseId, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.testType = '';
        this.labNotes = '';
        this.scanSelectedPartIds = [];
        this.scanActiveLayers = ['surface'];
        this.showScanSelectorModal = false;
        this.initializeTodayDate();
        this.resetValidationState();
        this.errorMessage = '';
        this.loadLabRequests(this.medicalCaseId!);
      },
      error: () => {
        this.errorMessage = 'Could not save lab request.';
        this.submitting = false;
      },
    });
  }

  deleteLabRequest(id: string): void {
    if (!id || !this.doctorId) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.dmrService.deleteLabRequest(id, this.doctorId).subscribe({
      next: () => {
        this.submitting = false;
        if (this.medicalCaseId) {
          this.loadLabRequests(this.medicalCaseId);
        }
      },
      error: () => {
        this.errorMessage = 'Could not delete lab request.';
        this.submitting = false;
      },
    });
  }

  private reloadFromBackend(): void {
    if (!this.patientId) {
      this.labRequests = [];
      this.medicalCaseId = null;
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.dmrService.getPatientMedicalCases(this.patientId).subscribe({
      next: (cases: MedicalCaseResponse[]) => {
        this.medicalCaseId = this.resolveMedicalCaseId(cases);
        if (!this.medicalCaseId) {
          this.labRequests = [];
          this.loading = false;
          return;
        }
        this.loadLabRequests(this.medicalCaseId);
      },
      error: () => {
        this.errorMessage = 'Could not load patient medical cases.';
        this.loading = false;
      },
    });
  }

  private loadLabRequests(medicalCaseId: string): void {
    this.loading = true;
    this.dmrService.getMedicalCaseDetails(medicalCaseId).subscribe({
      next: (details) => {
        const entries = details.details || [];
        this.labRequests = entries
          .filter((item: MedicalCaseDetailItem) => item.type === 'lab_request')
          .map((item: MedicalCaseDetailItem) => ({
            id: item.id,
            type: item.name || 'Lab request',
            date: item.date || '',
            notes: item.additionalInfo || '',
          }))
          .sort(
            (a, b) =>
              new Date(b.date || '').getTime() -
              new Date(a.date || '').getTime(),
          );
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load lab requests.';
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

  private initializeTodayDate(): void {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.labDate = `${today.getFullYear()}-${month}-${day}`;
  }

  private resetValidationState(): void {
    this.testTypeTouched = false;
    this.labDateTouched = false;
    this.labNotesTouched = false;
    this.scanSelectionTouched = false;
  }

  get testTypeError(): string {
    const normalized = this.normalizeFreeText(
      this.testType,
      this.testTypeMaxLength,
    );
    return normalized ? '' : 'Service type is required.';
  }

  get labDateError(): string {
    if (!this.labDate) {
      return 'Requested date is required.';
    }

    return this.normalizeDateInput(this.labDate)
      ? ''
      : 'Please enter a valid requested date.';
  }

  get labNotesError(): string {
    const normalized = this.normalizeFreeText(
      this.labNotes,
      this.notesMaxLength,
    );
    if (!normalized) {
      return `Notes are required (minimum ${this.labNotesMinLength} characters).`;
    }

    if (normalized.length < this.labNotesMinLength) {
      return `Notes must contain at least ${this.labNotesMinLength} characters.`;
    }

    return '';
  }

  get canSubmitLab(): boolean {
    return (
      !this.submitting &&
      !!this.medicalCaseId &&
      !!this.doctorId &&
      !this.testTypeError &&
      !this.labNotesError &&
      (!this.shouldShowBodyScanSelector || this.scanSelectedPartIds.length > 0)
    );
  }

  markTestTypeTouched(): void {
    this.testTypeTouched = true;
  }

  onTestTypeChange(value: string): void {
    this.testType = value;
    this.testTypeTouched = true;

    if (
      this.shouldShowBodyScanSelector &&
      this.scanSelectedPartIds.length === 0
    ) {
      this.openScanSelectorModal();
      return;
    }

    if (!this.shouldShowBodyScanSelector) {
      this.scanSelectedPartIds = [];
      this.scanActiveLayers = ['surface'];
      this.scanSelectionTouched = false;
      this.showScanSelectorModal = false;
    }
  }

  onScanSelectedPartIdsChange(partIds: string[]): void {
    this.scanSelectedPartIds = [...partIds];
    this.scanSelectionTouched = true;
  }

  onScanActiveLayersChange(layers: BodyScanLayer[]): void {
    this.scanActiveLayers = [...layers];
  }

  get shouldShowBodyScanSelector(): boolean {
    return isImagingLabServiceType(this.testType);
  }

  get scanSelectionError(): string {
    if (!this.shouldShowBodyScanSelector) {
      return '';
    }

    return this.scanSelectedPartIds.length > 0
      ? ''
      : 'Select at least one body area to scan.';
  }

  get scanSelectionSummary(): string {
    if (!this.shouldShowBodyScanSelector) {
      return '';
    }

    if (this.scanSelectedPartIds.length === 0) {
      return 'No body areas selected yet.';
    }

    const count = this.scanSelectedPartIds.length;
    return `${count} area${count === 1 ? '' : 's'} selected`;
  }

  openScanSelectorModal(): void {
    if (!this.shouldShowBodyScanSelector) {
      return;
    }

    this.showScanSelectorModal = true;
    this.scanSelectionTouched = true;
  }

  closeScanSelectorModal(): void {
    this.showScanSelectorModal = false;
  }

  onScanSelectorModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeScanSelectorModal();
    }
  }

  markLabNotesTouched(): void {
    this.labNotesTouched = true;
  }

  private buildCurrentDateValue(): string {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  }

  private normalizeFreeText(value: string, maxLength: number): string {
    const normalized = (value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '';
    }
    return normalized.slice(0, maxLength);
  }

  private normalizeDateInput(value: string): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
      return '';
    }

    return value;
  }
}
