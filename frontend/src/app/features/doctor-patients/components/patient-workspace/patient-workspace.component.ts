import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  UserService,
  PatientUserResponse,
} from '../../../../core/services/user.service';
import {
  DmrService,
  MedicalCaseDetailsResponse,
  MedicalCaseResponse,
} from '../../../../core/services/dmr.service';
import { PatientCacheService } from '../../services/patient-cache.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LAB_SERVICE_TYPE_OPTIONS } from '../../constants/lab-service-types';
import {
  BodyScanLayer,
  buildLabRequestNotes,
  isImagingLabServiceType,
  sanitizeLabScanSelection,
} from '../../../../shared/utils/lab-scan-metadata';

@Component({
  selector: 'app-patient-workspace',
  templateUrl: './patient-workspace.component.html',
  styleUrl: './patient-workspace.component.css',
})
export class PatientWorkspaceComponent implements OnInit, OnDestroy {
  patientId: string | null = null;
  patient: PatientUserResponse | null = null;
  caseDetails: MedicalCaseDetailsResponse | null | undefined = null;
  patientCases: MedicalCaseResponse[] = [];
  selectedCaseId: string | null = null;
  caseDropdownOptions: Array<{ label: string; value: string }> = [];
  loading = false;
  errorMessage = '';
  activeTab: 'overview' | 'consultation' | 'lab' | 'prescription' = 'overview';
  isSidebarOpen = true;
  showDeleteCaseModal = false;
  deletingSelectedCase = false;
  caseDeleteError = '';

  showLabQuickModal = false;
  showLabQuickScanModal = false;
  labQuickType = '';
  labQuickDate = '';
  labQuickNotes = '';
  labQuickSubmitting = false;
  labQuickError = '';
  labQuickTypeTouched = false;
  labQuickDateTouched = false;
  labQuickNotesTouched = false;
  labQuickScanTouched = false;
  labQuickScanSelectedPartIds: string[] = [];
  labQuickScanActiveLayers: BodyScanLayer[] = ['surface'];
  readonly defaultScanLayers: BodyScanLayer[] = ['surface'];
  labQuickTypeOptions = LAB_SERVICE_TYPE_OPTIONS;

  private doctorId = '';
  private readonly quickLabNotesMinLength = 3;
  private readonly quickTestTypeMaxLength = 80;
  private readonly quickLabNotesMaxLength = 1000;
  private hasBodyScrollLock = false;
  private readonly modalLockKey = 'modalLockCount';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private dmrService: DmrService,
    @Inject(PatientCacheService)
    private patientCacheService: PatientCacheService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.doctorId = this.authService.getUserIdAsString() || '';
    this.resetQuickLabDate();

    this.patientCacheService.workspace$
      .pipe(takeUntil(this.destroy$))
      .subscribe((workspaceData) => {
        if (!workspaceData) {
          return;
        }

        this.patient = workspaceData.patient;
        this.caseDetails = workspaceData.caseDetails;
      });

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.patientId = id;
        this.loadPatientData();
      }
    });

    // Sync active tab and case from query params
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const tab = params.get('tab');
        if (tab === 'consultation' || tab === 'lab' || tab === 'prescription') {
          this.activeTab = tab;
        } else {
          this.activeTab = 'overview';
        }

        const caseId = params.get('caseId');
        if (caseId && this.patientCases.some((c) => c.id === caseId)) {
          this.selectedCaseId = caseId;
          this.loadCaseDetails(caseId);
        }
      });
  }

  private loadPatientData(): void {
    if (!this.patientId) return;

    this.loading = true;
    this.errorMessage = '';

    // Load patient cases first
    this.dmrService.getPatientMedicalCases(this.patientId).subscribe({
      next: (cases: MedicalCaseResponse[]) => {
        this.patientCases = cases;
        this.caseDropdownOptions = cases.map((caseItem) => ({
          label: this.getCaseLabel(caseItem),
          value: caseItem.id,
        }));

        // Set selectedCaseId from query params or use latest case
        const queryCaseId = this.route.snapshot.queryParamMap.get('caseId');
        if (
          this.selectedCaseId &&
          cases.some((c) => c.id === this.selectedCaseId)
        ) {
          // keep user's currently selected case when switching tabs
        } else if (queryCaseId && cases.some((c) => c.id === queryCaseId)) {
          this.selectedCaseId = queryCaseId;
        } else if (cases.length > 0) {
          this.selectedCaseId = this.getDefaultCaseId(cases);
          // Update URL to include caseId
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { caseId: this.selectedCaseId },
            queryParamsHandling: 'merge',
          });
        }

        // Load cached patient and case details
        this.patientCacheService
          .selectPatient(this.patientId!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (cachedData) => {
              this.patient = cachedData.patient;
              this.caseDetails = cachedData.caseDetails;
              this.loading = false;
            },
            error: (error) => {
              console.error('Failed to load patient data:', error);
              this.errorMessage =
                'Failed to load patient information. Please try again.';
              this.loading = false;
            },
          });
      },
      error: (error) => {
        console.error('Failed to load patient cases:', error);
        this.errorMessage = 'Failed to load patient cases. Please try again.';
        this.loading = false;
      },
    });
  }

  private loadCaseDetails(caseId: string): void {
    if (!this.patientId || !caseId) return;

    // Load specific case details
    this.dmrService.getMedicalCaseDetails(caseId).subscribe({
      next: (details) => {
        this.caseDetails = details;
      },
      error: (error) => {
        console.error('Failed to load case details:', error);
      },
    });
  }

  selectCase(caseId: string): void {
    if (!caseId) return;
    this.selectedCaseId = caseId;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { caseId },
      queryParamsHandling: 'merge',
    });
    this.loadCaseDetails(caseId);
  }

  onCaseSelectionChange(caseId: string | null): void {
    if (!caseId || caseId === this.selectedCaseId) {
      return;
    }
    this.selectCase(caseId);
  }

  onTabChange(tab: 'overview' | 'consultation' | 'lab' | 'prescription'): void {
    this.activeTab = tab;
    const queryParams: { tab: string; caseId?: string } = { tab };
    if (this.selectedCaseId) {
      queryParams.caseId = this.selectedCaseId;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  goBackToDashboard(): void {
    this.router.navigate(['/doctor/patients']);
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  refreshPatientData(): void {
    if (!this.patientId) return;
    this.patientCacheService.invalidateCache();
    this.loadPatientData();
  }

  getSelectedCase(): MedicalCaseResponse | null {
    if (!this.selectedCaseId) return null;
    return this.patientCases.find((c) => c.id === this.selectedCaseId) || null;
  }

  canDeleteSelectedCase(): boolean {
    const selectedCase = this.getSelectedCase();
    return (
      !!selectedCase &&
      !!this.doctorId &&
      selectedCase.doctorId === this.doctorId
    );
  }

  openDeleteCaseModal(): void {
    if (!this.canDeleteSelectedCase()) {
      return;
    }

    this.caseDeleteError = '';
    this.showDeleteCaseModal = true;
    this.updateModalScrollLock();
  }

  closeDeleteCaseModal(): void {
    if (this.deletingSelectedCase) {
      return;
    }

    this.showDeleteCaseModal = false;
    this.caseDeleteError = '';
    this.updateModalScrollLock();
  }

  onCaseDeleteModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeDeleteCaseModal();
    }
  }

  confirmDeleteSelectedCase(): void {
    const selectedCase = this.getSelectedCase();
    if (!selectedCase || !this.canDeleteSelectedCase()) {
      return;
    }

    this.deletingSelectedCase = true;
    this.caseDeleteError = '';

    this.dmrService
      .deleteMedicalCase(selectedCase.id, this.doctorId)
      .subscribe({
        next: () => {
          this.deletingSelectedCase = false;
          this.showDeleteCaseModal = false;
          this.caseDeleteError = '';
          this.updateModalScrollLock();
          this.patientCacheService.invalidateCache();
          this.loadPatientData();
        },
        error: () => {
          this.deletingSelectedCase = false;
          this.caseDeleteError = 'Could not delete this medical case.';
        },
      });
  }

  private getDefaultCaseId(cases: MedicalCaseResponse[]): string {
    const firstActiveCase = cases.find((caseItem) => !caseItem.endDate);
    return firstActiveCase?.id || cases[0].id;
  }

  openLabQuickModal(): void {
    this.showLabQuickModal = true;
    this.labQuickError = '';
    this.labQuickType = '';
    this.labQuickNotes = '';
    this.labQuickTypeTouched = false;
    this.labQuickDateTouched = false;
    this.labQuickNotesTouched = false;
    this.labQuickScanTouched = false;
    this.labQuickScanSelectedPartIds = [];
    this.labQuickScanActiveLayers = ['surface'];
    this.showLabQuickScanModal = false;
    this.resetQuickLabDate();
    this.updateModalScrollLock();
  }

  closeLabQuickModal(): void {
    if (this.labQuickSubmitting) {
      return;
    }
    this.showLabQuickModal = false;
    this.showLabQuickScanModal = false;
    this.labQuickError = '';
    this.updateModalScrollLock();
  }

  onLabQuickModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeLabQuickModal();
    }
  }

  submitQuickLab(): void {
    if (!this.canSubmitQuickLab) {
      this.labQuickError = 'Please fix the highlighted quick lab fields.';
      return;
    }

    const normalizedType = this.normalizeFreeText(
      this.labQuickType,
      this.quickTestTypeMaxLength,
    );
    const autoDate = this.buildCurrentDateValue();
    this.labQuickDate = autoDate;
    const normalizedNotes = this.normalizeFreeText(
      this.labQuickNotes,
      this.quickLabNotesMaxLength,
    );
    const normalizedDate = autoDate;

    if (!this.patientId || !this.doctorId || !normalizedType) {
      this.labQuickError = 'Please choose service type first.';
      return;
    }

    if (
      this.shouldShowQuickLabScanSelector &&
      this.labQuickScanSelectedPartIds.length === 0
    ) {
      this.labQuickScanTouched = true;
      this.showLabQuickScanModal = true;
      this.labQuickError =
        'Select at least one body area for this custom scan request.';
      return;
    }

    this.labQuickSubmitting = true;
    this.labQuickError = '';
    this.labQuickType = normalizedType;
    this.labQuickNotes = normalizedNotes;

    const caseId = this.selectedCaseId;
    if (!caseId) {
      this.labQuickError = 'Please select a medical case first.';
      this.labQuickSubmitting = false;
      return;
    }

    const formattedNotes = normalizedDate
      ? `Requested date: ${normalizedDate}${normalizedNotes ? `\n${normalizedNotes}` : ''}`
      : normalizedNotes;

    const scanSelection = this.shouldShowQuickLabScanSelector
      ? sanitizeLabScanSelection({
          selectedPartIds: this.labQuickScanSelectedPartIds,
          activeLayers: this.labQuickScanActiveLayers,
        })
      : null;

    if (this.shouldShowQuickLabScanSelector && !scanSelection) {
      this.labQuickScanTouched = true;
      this.showLabQuickScanModal = true;
      this.labQuickError =
        'Select at least one body area for this custom scan request.';
      this.labQuickSubmitting = false;
      return;
    }

    this.dmrService
      .createLabRequest(caseId, {
        doctorId: this.doctorId,
        testType: normalizedType,
        notes: buildLabRequestNotes(formattedNotes, scanSelection),
      })
      .subscribe({
        next: () => {
          this.labQuickSubmitting = false;
          this.labQuickError = '';
          this.labQuickTypeTouched = false;
          this.labQuickDateTouched = false;
          this.labQuickNotesTouched = false;
          this.labQuickScanTouched = false;
          this.labQuickScanSelectedPartIds = [];
          this.labQuickScanActiveLayers = ['surface'];
          this.showLabQuickScanModal = false;
          this.closeLabQuickModal();
          this.refreshPatientData();
        },
        error: () => {
          this.labQuickError = 'Could not create lab request.';
          this.labQuickSubmitting = false;
        },
      });
  }

  private resetQuickLabDate(): void {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.labQuickDate = `${today.getFullYear()}-${month}-${day}`;
  }

  get labQuickTypeError(): string {
    const normalized = this.normalizeFreeText(
      this.labQuickType,
      this.quickTestTypeMaxLength,
    );
    return normalized ? '' : 'Service type is required.';
  }

  get labQuickDateError(): string {
    if (!this.labQuickDate) {
      return 'Requested date is required.';
    }

    return this.normalizeDateInput(this.labQuickDate)
      ? ''
      : 'Please enter a valid requested date.';
  }

  get labQuickNotesError(): string {
    const normalized = this.normalizeFreeText(
      this.labQuickNotes,
      this.quickLabNotesMaxLength,
    );
    if (!normalized) {
      return `Notes are required (minimum ${this.quickLabNotesMinLength} characters).`;
    }

    if (normalized.length < this.quickLabNotesMinLength) {
      return `Notes must contain at least ${this.quickLabNotesMinLength} characters.`;
    }

    return '';
  }

  get canSubmitQuickLab(): boolean {
    return (
      !this.labQuickSubmitting &&
      !!this.patientId &&
      !!this.doctorId &&
      !!this.selectedCaseId &&
      !this.labQuickTypeError &&
      !this.labQuickNotesError &&
      (!this.shouldShowQuickLabScanSelector ||
        this.labQuickScanSelectedPartIds.length > 0)
    );
  }

  markLabQuickTypeTouched(): void {
    this.labQuickTypeTouched = true;
  }

  onLabQuickTypeChange(value: string): void {
    this.labQuickType = value;
    this.labQuickTypeTouched = true;

    if (
      this.shouldShowQuickLabScanSelector &&
      this.labQuickScanSelectedPartIds.length === 0
    ) {
      this.openLabQuickScanModal();
      return;
    }

    if (!this.shouldShowQuickLabScanSelector) {
      this.labQuickScanTouched = false;
      this.labQuickScanSelectedPartIds = [];
      this.labQuickScanActiveLayers = ['surface'];
      this.showLabQuickScanModal = false;
    }
  }

  onLabQuickScanSelectedPartIdsChange(partIds: string[]): void {
    this.labQuickScanSelectedPartIds = [...partIds];
    this.labQuickScanTouched = true;
  }

  onLabQuickScanActiveLayersChange(layers: BodyScanLayer[]): void {
    this.labQuickScanActiveLayers = [...layers];
  }

  get shouldShowQuickLabScanSelector(): boolean {
    return isImagingLabServiceType(this.labQuickType);
  }

  get labQuickScanError(): string {
    if (!this.shouldShowQuickLabScanSelector) {
      return '';
    }

    return this.labQuickScanSelectedPartIds.length > 0
      ? ''
      : 'Select at least one body area to scan.';
  }

  get labQuickScanSummary(): string {
    if (!this.shouldShowQuickLabScanSelector) {
      return '';
    }

    const count = this.labQuickScanSelectedPartIds.length;
    if (!count) {
      return 'No body areas selected yet.';
    }

    return `${count} area${count === 1 ? '' : 's'} selected`;
  }

  openLabQuickScanModal(): void {
    if (!this.shouldShowQuickLabScanSelector) {
      return;
    }

    this.showLabQuickScanModal = true;
    this.labQuickScanTouched = true;
    this.updateModalScrollLock();
  }

  closeLabQuickScanModal(): void {
    this.showLabQuickScanModal = false;
    this.updateModalScrollLock();
  }

  onLabQuickScanModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeLabQuickScanModal();
    }
  }

  markLabQuickNotesTouched(): void {
    this.labQuickNotesTouched = true;
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

  getCaseLabel(caseItem: MedicalCaseResponse): string {
    return (caseItem.name || '').trim() || 'Case';
  }

  ngOnDestroy(): void {
    this.setBodyScrollLock(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateModalScrollLock(): void {
    this.setBodyScrollLock(
      this.showDeleteCaseModal ||
        this.showLabQuickModal ||
        this.showLabQuickScanModal,
    );
  }

  private setBodyScrollLock(shouldLock: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    const body = document.body;
    const html = document.documentElement;
    const lockCount = Number(body.dataset[this.modalLockKey] || '0');

    if (shouldLock && !this.hasBodyScrollLock) {
      body.dataset[this.modalLockKey] = String(lockCount + 1);
      body.classList.add('modal-scroll-lock');
      html.classList.add('modal-scroll-lock');
      this.hasBodyScrollLock = true;
      return;
    }

    if (!shouldLock && this.hasBodyScrollLock) {
      const nextCount = Math.max(0, lockCount - 1);
      body.dataset[this.modalLockKey] = String(nextCount);
      if (nextCount === 0) {
        body.classList.remove('modal-scroll-lock');
        html.classList.remove('modal-scroll-lock');
      }
      this.hasBodyScrollLock = false;
    }
  }
}
