import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {
  UserService,
  PatientUserResponse,
  UserLookupResponse,
} from '../../core/services/user.service';
import {
  CreateConsultationRequest,
  CreateLabRequestRequest,
  CreatePrescriptionRequest,
  DosageItemResponse,
  DmrService,
  MedicineItemResponse,
  MedicalCaseDetailItem,
  MedicalCaseDetailsResponse,
  MedicalCaseResponse,
} from '../../core/services/dmr.service';
import { forkJoin, of } from 'rxjs';
import { LAB_SERVICE_TYPE_OPTIONS } from './constants/lab-service-types';

interface DoctorPatientRow {
  patientId: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  latestCaseName: string;
  lastCaseDate: string;
  totalCases: number;
  cases: MedicalCaseResponse[];
}

interface DosePlanForm {
  medicineId: string;
  medicineQuery: string;
  medicineDescription: string;
  suggestionsOpen: boolean;
  morning: number;
  afternoon: number;
  night: number;
  days: number;
  doseNotes: string;
  collapsed: boolean;
}

interface EditableDosageRow {
  id: string;
  medicineId: string;
  medicineName: string;
  quantity: string;
  doseNotes: string;
  dateValue: string;
  period: 'morning' | 'afternoon' | 'night';
  taken: boolean;
}

@Component({
  selector: 'app-doctor-patients',
  templateUrl: './doctor-patients.component.html',
  styleUrl: './doctor-patients.component.css',
})
export class DoctorPatientsComponent implements OnInit {
  loading = false;
  submitting = false;
  actionSubmitting = false;
  detailsLoading = false;
  errorMessage = '';
  successMessage = '';
  showAddPatientModal = false;
  addPatientStep: 'code' | 'action' = 'code';
  addPatientAction: 'create' | 'join' = 'create';
  addPatientCode = '';
  addPatientCaseName = '';
  addPatientValidatedPatientId = '';
  addPatientExistingCases: MedicalCaseResponse[] = [];
  addPatientJoinCaseId = '';
  addPatientCasesLoading = false;
  addPatientModalError = '';
  showCaseEditModal = false;
  showCaseDeleteModal = false;
  caseActionSubmitting = false;
  caseEditName = '';
  doctorId = '';
  selectedPatient: DoctorPatientRow | null = null;
  selectedCase: MedicalCaseResponse | null = null;
  selectedCaseDetails: MedicalCaseDetailsResponse | null = null;
  selectedPatientProfile: PatientUserResponse | null = null;
  patientProfileLoading = false;
  patientProfileError = '';
  patientViewMode: 'cases' | 'profile' = 'cases';
  activePanel: 'consultation' | 'lab' | 'prescription' = 'consultation';
  isActivityComposerCollapsed = false;
  isTimelineCollapsed = false;

  patientRows: DoctorPatientRow[] = [];
  medicines: MedicineItemResponse[] = [];
  doctorDisplayNameById: Record<string, string> = {};
  showTimelineEditModal = false;
  showTimelineDeleteModal = false;
  activeTimelineDetail: MedicalCaseDetailItem | null = null;
  timelineActionSubmitting = false;
  timelineDosagesLoading = false;
  prescriptionDosagesForEdit: EditableDosageRow[] = [];
  removedDosageIds: string[] = [];
  editTimelineForm = {
    name: '',
    additionalInfo: '',
    date: '',
  };

  consultationForm = {
    consultationDate: this.formatDatetimeLocal(new Date()),
    notes: '',
  };

  labForm = {
    testType: 'X-Ray',
    notes: '',
  };

  prescriptionSummary = '';
  dosePlans: DosePlanForm[] = [this.createDosePlan()];
  readonly dosagePeriodOptions = [
    { label: 'Morning', value: 'morning' },
    { label: 'Afternoon', value: 'afternoon' },
    { label: 'Night', value: 'night' },
  ];
  readonly testTypeOptions = LAB_SERVICE_TYPE_OPTIONS;

  constructor(
    private readonly authService: AuthService,
    private readonly dmrService: DmrService,
    private readonly userService: UserService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.doctorId = this.authService.getUserIdAsString() || '';
    if (!this.doctorId) {
      this.errorMessage = 'Unable to detect doctor id from your account.';
      return;
    }
    this.loadMedicines();
    this.loadDoctorPatients();
  }

  loadDoctorPatients(onLoaded?: () => void): void {
    this.loading = true;
    this.errorMessage = '';

    this.dmrService.getDoctorMedicalCases(this.doctorId).subscribe({
      next: (cases) => {
        this.patientRows = this.buildPatientRows(cases);
        this.enrichPatientRows();
        this.loading = false;
        onLoaded?.();
      },
      error: () => {
        this.errorMessage = 'Failed to load patients from DMR service.';
        this.loading = false;
      },
    });
  }

  private enrichPatientRows(): void {
    this.patientRows.forEach((patient) => {
      const normalizedPatientId = this.normalizeUuid(patient.patientId);
      if (!normalizedPatientId) {
        patient.firstName = 'Patient';
        patient.lastName = '';
        return;
      }

      this.userService.getUserById(normalizedPatientId).subscribe({
        next: (profile) => {
          const firstName = (profile.firstName || '').trim();
          const lastName = (profile.lastName || '').trim();
          const singleName = (
            profile.name ||
            profile.labName ||
            profile.companyName ||
            ''
          ).trim();
          const emailPrefix = (profile.email || '').split('@')[0]?.trim();

          if (firstName || lastName) {
            patient.firstName = firstName || 'Patient';
            patient.lastName = lastName;
          } else if (singleName) {
            patient.firstName = singleName;
            patient.lastName = '';
          } else {
            patient.firstName = emailPrefix || 'Patient';
            patient.lastName = '';
          }

          patient.profilePictureUrl = profile.profilePictureUrl;
        },
        error: () => {
          patient.firstName = 'Patient';
          patient.lastName = '';
        },
      });
    });
  }

  openAddPatientModal(): void {
    if (this.submitting) {
      return;
    }

    this.addPatientStep = 'code';
    this.addPatientAction = 'create';
    this.addPatientCode = '';
    this.addPatientCaseName = '';
    this.addPatientValidatedPatientId = '';
    this.addPatientExistingCases = [];
    this.addPatientJoinCaseId = '';
    this.addPatientCasesLoading = false;
    this.addPatientModalError = '';
    this.showAddPatientModal = true;
  }

  closeAddPatientModal(): void {
    if (this.submitting) {
      return;
    }
    this.showAddPatientModal = false;
    this.addPatientCasesLoading = false;
    this.addPatientModalError = '';
  }

  onAddPatientModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeAddPatientModal();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.showCaseEditModal) {
      this.closeCaseEditModal();
      return;
    }

    if (this.showCaseDeleteModal) {
      this.closeCaseDeleteModal();
      return;
    }

    if (this.showTimelineEditModal) {
      this.closeTimelineEditModal();
      return;
    }

    if (this.showTimelineDeleteModal) {
      this.closeTimelineDeleteModal();
      return;
    }

    if (this.showAddPatientModal) {
      this.closeAddPatientModal();
    }
  }

  submitAddPatientFromModal(): void {
    const code = this.addPatientCode.trim().toUpperCase();

    if (!code) {
      this.addPatientModalError = 'Patient access code is required.';
      return;
    }

    if (this.addPatientStep === 'code') {
      this.validateAddPatientCode(code);
      return;
    }

    if (this.addPatientAction === 'join') {
      this.joinExistingCaseFromModal(code);
      return;
    }

    this.createNewCaseFromModal(code);
  }

  openCaseEditModal(): void {
    if (!this.selectedCase || this.caseActionSubmitting) {
      return;
    }

    this.caseEditName = this.selectedCase.name || '';
    this.showCaseEditModal = true;
  }

  closeCaseEditModal(): void {
    if (this.caseActionSubmitting) {
      return;
    }
    this.showCaseEditModal = false;
  }

  onCaseEditModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeCaseEditModal();
    }
  }

  saveMedicalCaseFromModal(): void {
    if (!this.selectedCase) {
      return;
    }

    const name = this.caseEditName.trim();
    if (!name) {
      this.errorMessage = 'Case name is required.';
      return;
    }

    this.caseActionSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.dmrService
      .updateMedicalCase(this.selectedCase.id, {
        doctorId: this.doctorId,
        name,
        startDate: this.selectedCase.startDate,
        endDate: this.selectedCase.endDate || undefined,
      })
      .subscribe({
        next: (updatedCase) => {
          this.successMessage = 'Medical case updated successfully.';
          this.caseActionSubmitting = false;
          this.showCaseEditModal = false;
          this.loadDoctorPatients(() => this.openCaseById(updatedCase.id));
        },
        error: (error) => {
          this.caseActionSubmitting = false;
          this.errorMessage =
            error?.error?.message ||
            error?.error?.error ||
            'Failed to update medical case.';
        },
      });
  }

  openCaseDeleteModal(): void {
    if (!this.selectedCase || this.caseActionSubmitting) {
      return;
    }

    this.showCaseDeleteModal = true;
  }

  closeCaseDeleteModal(): void {
    if (this.caseActionSubmitting) {
      return;
    }
    this.showCaseDeleteModal = false;
  }

  onCaseDeleteModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeCaseDeleteModal();
    }
  }

  confirmDeleteMedicalCase(): void {
    if (!this.selectedCase) {
      return;
    }

    const selectedPatientId = this.selectedPatient?.patientId || null;
    const selectedPatientCaseCount = this.selectedPatient?.cases?.length || 0;
    const deletedCaseId = this.selectedCase.id;
    this.caseActionSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.dmrService.deleteMedicalCase(deletedCaseId, this.doctorId).subscribe({
      next: () => {
        this.caseActionSubmitting = false;
        this.showCaseDeleteModal = false;
        this.showCaseEditModal = false;
        this.successMessage = 'Medical case deleted successfully.';
        this.selectedCase = null;
        this.selectedCaseDetails = null;
        this.loadDoctorPatients(() => {
          if (selectedPatientId && selectedPatientCaseCount <= 1) {
            this.selectedPatient = null;
            this.router.navigate(['/doctor/patients']);
            return;
          }

          if (selectedPatientId) {
            const refreshedPatient = this.patientRows.find(
              (row) => row.patientId === selectedPatientId,
            );
            this.selectedPatient = refreshedPatient || null;
          }
        });
      },
      error: (error) => {
        this.caseActionSubmitting = false;
        this.errorMessage =
          error?.error?.message ||
          error?.error?.error ||
          'Failed to delete medical case.';
      },
    });
  }

  goBackToAddPatientCodeStep(): void {
    if (this.submitting) {
      return;
    }

    this.addPatientStep = 'code';
    this.addPatientAction = 'create';
    this.addPatientJoinCaseId = '';
    this.addPatientModalError = '';
  }

  setAddPatientAction(action: 'create' | 'join'): void {
    if (action === 'join' && this.addPatientExistingCases.length === 0) {
      return;
    }

    this.addPatientAction = action;
    this.addPatientModalError = '';
  }

  private validateAddPatientCode(code: string): void {
    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.addPatientModalError = '';

    this.dmrService.validateAccessCode(code).subscribe({
      next: (response) => {
        this.addPatientValidatedPatientId = response.patientId;
        this.addPatientStep = 'action';
        this.addPatientAction = 'create';
        this.addPatientJoinCaseId = '';
        this.loadExistingCasesForValidatedPatient();
      },
      error: (error) => {
        const status = Number(error?.status || 0);
        const rawMessage = String(
          error?.error?.message || error?.error?.error || '',
        ).toLowerCase();
        const isIncorrectCode =
          status === 400 ||
          rawMessage.includes('invalid patient code') ||
          rawMessage.includes('bad request');

        const message = isIncorrectCode
          ? 'Incorrect patient code.'
          : error?.error?.message ||
            error?.error?.error ||
            'Could not validate patient code.';

        this.errorMessage = message;
        this.addPatientModalError = message;
        this.submitting = false;
      },
    });
  }

  private loadExistingCasesForValidatedPatient(): void {
    if (!this.addPatientValidatedPatientId) {
      this.addPatientExistingCases = [];
      this.addPatientCasesLoading = false;
      this.submitting = false;
      return;
    }

    this.addPatientCasesLoading = true;
    this.dmrService
      .getPatientMedicalCases(this.addPatientValidatedPatientId)
      .subscribe({
        next: (cases) => {
          this.addPatientExistingCases = cases;
          this.addPatientJoinCaseId = cases[0]?.id || '';
          this.addPatientCasesLoading = false;
          this.submitting = false;
        },
        error: () => {
          this.addPatientExistingCases = [];
          this.addPatientJoinCaseId = '';
          this.addPatientCasesLoading = false;
          this.submitting = false;
          this.addPatientModalError =
            'Code is valid, but existing cases could not be loaded.';
        },
      });
  }

  private createNewCaseFromModal(code: string): void {
    const caseName = this.addPatientCaseName.trim();

    if (!caseName) {
      this.addPatientModalError = 'Case name is required.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.addPatientModalError = '';

    const today = new Date().toISOString().slice(0, 10);
    this.dmrService
      .createMedicalCase({
        accessCode: code,
        doctorId: this.doctorId,
        name: caseName,
        startDate: today,
      })
      .subscribe({
        next: (medicalCase) => {
          this.successMessage =
            'Patient added and medical case created successfully.';
          this.submitting = false;
          this.showAddPatientModal = false;
          this.loadDoctorPatients();
          this.openCaseById(medicalCase.id);
        },
        error: (error) => {
          const message =
            error?.error?.message ||
            error?.error?.error ||
            'Could not create case. Check details and try again.';
          this.errorMessage = message;
          this.addPatientModalError = message;
          this.submitting = false;
        },
      });
  }

  private joinExistingCaseFromModal(code: string): void {
    if (!this.addPatientJoinCaseId) {
      this.addPatientModalError = 'Select an existing case to join.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.addPatientModalError = '';

    this.dmrService
      .joinMedicalCase(this.addPatientJoinCaseId, {
        accessCode: code,
        doctorId: this.doctorId,
      })
      .subscribe({
        next: (medicalCase) => {
          this.successMessage = 'Joined existing medical case successfully.';
          this.submitting = false;
          this.showAddPatientModal = false;
          this.loadDoctorPatients();
          this.openCaseById(medicalCase.id);
        },
        error: (error) => {
          const message =
            error?.error?.message ||
            error?.error?.error ||
            'Could not join selected case. Check access code and try again.';
          this.errorMessage = message;
          this.addPatientModalError = message;
          this.submitting = false;
        },
      });
  }

  openPatient(patient: DoctorPatientRow): void {
    this.selectedPatient = patient;
    this.patientViewMode = 'cases';
    this.selectedPatientProfile = null;
    this.patientProfileError = '';
    this.patientProfileLoading = false;
    const latest = [...patient.cases].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

    if (latest) {
      this.openCase(latest);
    }
  }

  openCase(medicalCase: MedicalCaseResponse): void {
    this.selectedCase = medicalCase;
    this.closeTimelineEditModal();
    this.closeTimelineDeleteModal();
    this.loadCaseDetails(medicalCase.id);
  }

  showCasesView(): void {
    this.patientViewMode = 'cases';
  }

  showProfileView(): void {
    this.patientViewMode = 'profile';
    this.loadSelectedPatientProfile();
  }

  loadSelectedPatientProfile(): void {
    if (!this.selectedPatient) {
      return;
    }

    const normalizedPatientId = this.normalizeUuid(
      this.selectedPatient.patientId,
    );
    if (!normalizedPatientId) {
      this.selectedPatientProfile = null;
      this.patientProfileError = 'Invalid patient identifier.';
      this.patientProfileLoading = false;
      return;
    }

    this.patientProfileLoading = true;
    this.patientProfileError = '';

    this.userService.getPatientProfile(normalizedPatientId).subscribe({
      next: (profile) => {
        this.selectedPatientProfile = profile;
        this.patientProfileLoading = false;
      },
      error: () => {
        this.selectedPatientProfile = null;
        this.patientProfileError = 'Failed to load patient profile details.';
        this.patientProfileLoading = false;
      },
    });
  }

  submitConsultation(): void {
    if (!this.selectedCase) {
      return;
    }

    const payload: CreateConsultationRequest = {
      doctorId: this.doctorId,
      consultationDate: new Date(
        this.consultationForm.consultationDate,
      ).toISOString(),
      notes: this.consultationForm.notes,
    };

    this.actionSubmitting = true;
    this.dmrService
      .createConsultation(this.selectedCase.id, payload)
      .subscribe({
        next: () => {
          this.successMessage = 'Consultation added to this case.';
          this.consultationForm.notes = '';
          this.actionSubmitting = false;
          this.loadCaseDetails(this.selectedCase!.id);
        },
        error: () => {
          this.errorMessage = 'Could not add consultation.';
          this.actionSubmitting = false;
        },
      });
  }

  submitLabRequest(): void {
    if (!this.selectedCase) {
      return;
    }

    const payload: CreateLabRequestRequest = {
      doctorId: this.doctorId,
      testType: this.labForm.testType,
      notes: this.labForm.notes,
    };

    this.actionSubmitting = true;
    this.dmrService.createLabRequest(this.selectedCase.id, payload).subscribe({
      next: () => {
        this.successMessage = 'Lab request added to this case.';
        this.labForm.notes = '';
        this.actionSubmitting = false;
        this.loadCaseDetails(this.selectedCase!.id);
      },
      error: () => {
        this.errorMessage = 'Could not add lab request.';
        this.actionSubmitting = false;
      },
    });
  }

  submitPrescription(): void {
    if (!this.selectedCase) {
      return;
    }

    const normalizedPlans = this.dosePlans.map((plan) => ({
      medicineId: plan.medicineId,
      morning: Number(plan.morning) || 0,
      afternoon: Number(plan.afternoon) || 0,
      night: Number(plan.night) || 0,
      days: Number(plan.days) || 0,
      doseNotes: plan.doseNotes?.trim() || '',
    }));

    const invalidPlan = normalizedPlans.find(
      (plan) =>
        !plan.medicineId ||
        plan.days < 1 ||
        plan.morning + plan.afternoon + plan.night <= 0,
    );
    if (invalidPlan) {
      this.errorMessage =
        'Each dose row needs a medicine, at least one period value, and duration of 1 day or more.';
      return;
    }

    this.actionSubmitting = true;

    const payload: CreatePrescriptionRequest = {
      doctorId: this.doctorId,
      notes: this.prescriptionSummary,
      dosePlans: normalizedPlans,
    };

    this.dmrService
      .createPrescription(this.selectedCase.id, payload)
      .subscribe({
        next: () => {
          this.successMessage = 'Prescription created successfully.';
          this.actionSubmitting = false;
          this.prescriptionSummary = '';
          this.dosePlans = [this.createDosePlan()];
          this.loadCaseDetails(this.selectedCase!.id);
        },
        error: () => {
          this.errorMessage = 'Could not create prescription.';
          this.actionSubmitting = false;
        },
      });
  }

  addDosePlan(): void {
    this.dosePlans = [...this.dosePlans, this.createDosePlan()];
  }

  removeDosePlan(index: number): void {
    if (this.dosePlans.length === 1) {
      this.dosePlans = [this.createDosePlan()];
      return;
    }
    this.dosePlans = this.dosePlans.filter((_, idx) => idx !== index);
  }

  toggleDosePlan(index: number): void {
    const row = this.dosePlans[index];
    if (!row) {
      return;
    }
    row.collapsed = !row.collapsed;
  }

  onDoseMedicineQueryChange(plan: DosePlanForm, query: string): void {
    plan.medicineQuery = query;
    plan.suggestionsOpen = true;
    const match = this.findMedicineByName(query);
    if (match) {
      this.applyMedicineSelection(plan, match);
    } else {
      plan.medicineId = '';
      plan.medicineDescription = '';
    }
  }

  getDoseHeaderMedicine(plan: DosePlanForm): string {
    return plan.medicineQuery || 'Select medicine';
  }

  getDoseHeaderSummary(plan: DosePlanForm): string {
    const segments: string[] = [];
    if ((Number(plan.morning) || 0) > 0) {
      segments.push(`Morning ${plan.morning}`);
    }
    if ((Number(plan.afternoon) || 0) > 0) {
      segments.push(`Afternoon ${plan.afternoon}`);
    }
    if ((Number(plan.night) || 0) > 0) {
      segments.push(`Night ${plan.night}`);
    }

    const dosesText =
      segments.length > 0 ? segments.join(', ') : 'No doses set';
    return `${dosesText}, for ${plan.days} day${plan.days === 1 ? '' : 's'}`;
  }

  onDoseMedicineFocus(plan: DosePlanForm): void {
    plan.suggestionsOpen = true;
  }

  onDoseMedicineBlur(plan: DosePlanForm): void {
    setTimeout(() => {
      plan.suggestionsOpen = false;
    }, 120);
  }

  selectMedicineSuggestion(
    plan: DosePlanForm,
    medicine: MedicineItemResponse,
  ): void {
    this.applyMedicineSelection(plan, medicine);
    plan.suggestionsOpen = false;
  }

  getFilteredMedicines(plan: DosePlanForm): MedicineItemResponse[] {
    const query = (plan.medicineQuery || '').trim().toLowerCase();
    if (!query) {
      return this.medicines.slice(0, 12);
    }

    return this.medicines
      .filter((item) => {
        const name = (item.name || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        return name.includes(query) || description.includes(query);
      })
      .slice(0, 12);
  }

  trackByDosePlan(index: number): number {
    return index;
  }

  getDetailBadgeClass(type: string): string {
    switch (type) {
      case 'consultation':
        return 'badge badge-consultation';
      case 'lab_request':
        return 'badge badge-lab';
      case 'lab_results':
        return 'badge badge-result';
      case 'treatment':
        return 'badge badge-treatment';
      default:
        return 'badge';
    }
  }

  getDetailTypeLabel(type: string): string {
    if (type === 'lab_request') {
      return 'Lab Request';
    }
    if (type === 'lab_results') {
      return 'Lab Results';
    }
    if (type === 'consultation') {
      return 'Consultation';
    }
    if (type === 'treatment') {
      return 'Treatment';
    }
    return type;
  }

  trackByCaseId(_: number, entry: MedicalCaseResponse): string {
    return entry.id;
  }

  trackByDetail(_: number, entry: MedicalCaseDetailItem): string {
    return entry.id || `${entry.type}-${entry.date}-${entry.name}`;
  }

  isEditableTimelineEntry(detail: MedicalCaseDetailItem): boolean {
    const editableType =
      detail.type === 'consultation' ||
      detail.type === 'lab_request' ||
      detail.type === 'treatment';

    return (
      editableType &&
      !!detail.id &&
      !!detail.doctorId &&
      detail.doctorId === this.doctorId
    );
  }

  getTimelineDoctorLabel(detail: MedicalCaseDetailItem): string {
    const doctorId = detail.doctorId || '';
    const fallback = detail.involvedPersonnel || 'Doctor';

    if (!doctorId) {
      return fallback;
    }

    const knownName = this.doctorDisplayNameById[doctorId] || '';
    if (knownName) {
      return doctorId === this.doctorId ? `${knownName} (you)` : knownName;
    }

    return doctorId === this.doctorId ? 'Dr. You (you)' : fallback;
  }

  hasTimelineFile(detail: MedicalCaseDetailItem): boolean {
    return detail.type === 'lab_results' && !!(detail.fileUrl || '').trim();
  }

  openTimelineFile(detail: MedicalCaseDetailItem): void {
    const url = (detail.fileUrl || '').trim();
    if (!url) {
      return;
    }

    window.open(url, '_blank', 'noopener');
  }

  openTimelineEditModal(detail: MedicalCaseDetailItem): void {
    if (!this.isEditableTimelineEntry(detail) || !detail.id) {
      return;
    }

    this.showTimelineDeleteModal = false;
    this.activeTimelineDetail = detail;
    this.editTimelineForm.name = detail.name || '';
    this.editTimelineForm.additionalInfo = detail.additionalInfo || '';
    this.editTimelineForm.date = this.toDatetimeLocalValue(detail.date);
    this.prescriptionDosagesForEdit = [];
    this.removedDosageIds = [];
    this.showTimelineEditModal = true;

    if (detail.type === 'treatment' && detail.id) {
      this.timelineDosagesLoading = true;
      this.dmrService.getPrescriptionDosages(detail.id).subscribe({
        next: (dosages) => {
          this.prescriptionDosagesForEdit = dosages.map((row) =>
            this.toEditableDosageRow(row),
          );
          this.timelineDosagesLoading = false;
        },
        error: () => {
          this.errorMessage = 'Could not load linked dosages.';
          this.timelineDosagesLoading = false;
        },
      });
    }
  }

  closeTimelineEditModal(): void {
    if (this.timelineActionSubmitting) {
      return;
    }
    this.showTimelineEditModal = false;
    this.activeTimelineDetail = null;
    this.timelineDosagesLoading = false;
    this.prescriptionDosagesForEdit = [];
    this.removedDosageIds = [];
    this.editTimelineForm = {
      name: '',
      additionalInfo: '',
      date: '',
    };
  }

  onTimelineEditModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeTimelineEditModal();
    }
  }

  removePrescriptionDosageRow(index: number): void {
    const row = this.prescriptionDosagesForEdit[index];
    if (!row) {
      return;
    }

    this.removedDosageIds = [...this.removedDosageIds, row.id];
    this.prescriptionDosagesForEdit = this.prescriptionDosagesForEdit.filter(
      (_, idx) => idx !== index,
    );
  }

  saveTimelineDetailFromModal(): void {
    const detail = this.activeTimelineDetail;
    if (!detail?.id || !this.isEditableTimelineEntry(detail)) {
      return;
    }

    this.timelineActionSubmitting = true;
    this.errorMessage = '';

    if (detail.type === 'consultation') {
      if (!this.editTimelineForm.date) {
        this.errorMessage = 'Consultation date is required.';
        this.timelineActionSubmitting = false;
        return;
      }

      this.dmrService
        .updateConsultation(detail.id, {
          doctorId: this.doctorId,
          consultationDate: new Date(this.editTimelineForm.date).toISOString(),
          notes: this.editTimelineForm.additionalInfo,
        })
        .subscribe({
          next: () => {
            this.successMessage = 'Consultation updated.';
            this.timelineActionSubmitting = false;
            this.closeTimelineEditModal();
            if (this.selectedCase?.id) {
              this.loadCaseDetails(this.selectedCase.id);
            }
          },
          error: () => {
            this.errorMessage = 'Could not update consultation.';
            this.timelineActionSubmitting = false;
          },
        });
      return;
    }

    if (detail.type === 'lab_request') {
      const testType = this.editTimelineForm.name.trim();
      if (!testType) {
        this.errorMessage = 'Service type is required.';
        this.timelineActionSubmitting = false;
        return;
      }

      this.dmrService
        .updateLabRequest(detail.id, {
          doctorId: this.doctorId,
          testType,
          notes: this.editTimelineForm.additionalInfo,
        })
        .subscribe({
          next: () => {
            this.successMessage = 'Lab request updated.';
            this.timelineActionSubmitting = false;
            this.closeTimelineEditModal();
            if (this.selectedCase?.id) {
              this.loadCaseDetails(this.selectedCase.id);
            }
          },
          error: () => {
            this.errorMessage = 'Could not update lab request.';
            this.timelineActionSubmitting = false;
          },
        });
      return;
    }

    if (detail.type === 'treatment') {
      const invalidRow = this.prescriptionDosagesForEdit.find(
        (row) => !row.quantity?.trim() || !row.dateValue || !row.period,
      );
      if (invalidRow) {
        this.errorMessage =
          'Each dosage row must have quantity, date, and period.';
        this.timelineActionSubmitting = false;
        return;
      }

      const dosageUpdates = this.prescriptionDosagesForEdit.map((row) =>
        this.dmrService.updateDosage(row.id, {
          doctorId: this.doctorId,
          quantity: row.quantity.trim(),
          doseNotes: row.doseNotes,
          time: this.combineDateAndPeriodToIso(row.dateValue, row.period),
          taken: row.taken,
        }),
      );

      const dosageDeletes = this.removedDosageIds.map((dosageId) =>
        this.dmrService.deleteDosage(dosageId, this.doctorId),
      );

      this.dmrService
        .updatePrescription(detail.id, {
          doctorId: this.doctorId,
          notes: this.editTimelineForm.additionalInfo,
        })
        .subscribe({
          next: () => {
            const followUpCalls = [...dosageUpdates, ...dosageDeletes];
            const doseUpdateFlow = followUpCalls.length
              ? forkJoin(followUpCalls)
              : of([]);

            doseUpdateFlow.subscribe({
              next: () => {
                this.successMessage =
                  'Prescription and linked dosages updated.';
                this.timelineActionSubmitting = false;
                this.closeTimelineEditModal();
                if (this.selectedCase?.id) {
                  this.loadCaseDetails(this.selectedCase.id);
                }
              },
              error: () => {
                this.errorMessage =
                  'Prescription updated, but some dosage operations failed.';
                this.timelineActionSubmitting = false;
              },
            });
          },
          error: () => {
            this.errorMessage = 'Could not update prescription.';
            this.timelineActionSubmitting = false;
          },
        });
      return;
    }

    this.timelineActionSubmitting = false;
  }

  openTimelineDeleteModal(detail: MedicalCaseDetailItem): void {
    if (!this.isEditableTimelineEntry(detail) || !detail.id) {
      return;
    }

    this.showTimelineEditModal = false;
    this.activeTimelineDetail = detail;
    this.showTimelineDeleteModal = true;
  }

  closeTimelineDeleteModal(): void {
    if (this.timelineActionSubmitting) {
      return;
    }
    this.showTimelineDeleteModal = false;
    this.activeTimelineDetail = null;
  }

  onTimelineDeleteModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeTimelineDeleteModal();
    }
  }

  confirmTimelineDelete(): void {
    const detail = this.activeTimelineDetail;
    if (!detail?.id || !this.isEditableTimelineEntry(detail)) {
      return;
    }

    this.timelineActionSubmitting = true;
    this.errorMessage = '';

    if (detail.type === 'consultation') {
      this.dmrService.deleteConsultation(detail.id, this.doctorId).subscribe({
        next: () => {
          this.successMessage = 'Consultation deleted.';
          this.timelineActionSubmitting = false;
          this.closeTimelineDeleteModal();
          if (this.selectedCase?.id) {
            this.loadCaseDetails(this.selectedCase.id);
          }
        },
        error: () => {
          this.errorMessage = 'Could not delete consultation.';
          this.timelineActionSubmitting = false;
        },
      });
      return;
    }

    if (detail.type === 'lab_request') {
      this.dmrService.deleteLabRequest(detail.id, this.doctorId).subscribe({
        next: () => {
          this.successMessage = 'Lab request deleted.';
          this.timelineActionSubmitting = false;
          this.closeTimelineDeleteModal();
          if (this.selectedCase?.id) {
            this.loadCaseDetails(this.selectedCase.id);
          }
        },
        error: () => {
          this.errorMessage = 'Could not delete lab request.';
          this.timelineActionSubmitting = false;
        },
      });
      return;
    }

    if (detail.type === 'treatment') {
      this.dmrService.deletePrescription(detail.id, this.doctorId).subscribe({
        next: () => {
          this.successMessage = 'Prescription deleted.';
          this.timelineActionSubmitting = false;
          this.closeTimelineDeleteModal();
          if (this.selectedCase?.id) {
            this.loadCaseDetails(this.selectedCase.id);
          }
        },
        error: () => {
          this.errorMessage = 'Could not delete prescription.';
          this.timelineActionSubmitting = false;
        },
      });
      return;
    }

    this.timelineActionSubmitting = false;
  }

  getTimelineEditModalTitle(): string {
    const type = this.activeTimelineDetail?.type;
    if (type === 'consultation') {
      return 'Edit Consultation';
    }
    if (type === 'lab_request') {
      return 'Edit Lab Request';
    }
    if (type === 'treatment') {
      return 'Edit Prescription';
    }
    return 'Edit Timeline Entry';
  }

  getTimelineDeletePrompt(): string {
    const type = this.activeTimelineDetail?.type;
    if (type === 'consultation') {
      return 'Are you sure you want to delete this consultation?';
    }
    if (type === 'lab_request') {
      return 'Are you sure you want to delete this lab request?';
    }
    if (type === 'treatment') {
      return 'Delete this prescription and all linked dosages?';
    }
    return 'Are you sure you want to delete this timeline entry?';
  }

  private loadCaseDetails(medicalCaseId: string): void {
    this.detailsLoading = true;
    this.errorMessage = '';
    this.dmrService.getMedicalCaseDetails(medicalCaseId).subscribe({
      next: (details) => {
        this.selectedCaseDetails = details;
        this.prefetchDoctorNames(details.details || []);
        this.detailsLoading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load selected case details.';
        this.detailsLoading = false;
      },
    });
  }

  private loadMedicines(): void {
    this.dmrService.getMedicines().subscribe({
      next: (medicines) => {
        this.medicines = medicines;

        this.dosePlans.forEach((plan) => {
          if (!plan.medicineId && !plan.medicineQuery) {
            return;
          }
          if (plan.medicineId) {
            const byId = this.medicines.find(
              (item) => item.id === plan.medicineId,
            );
            if (byId) {
              this.applyMedicineSelection(plan, byId);
              return;
            }
          }
          const byName = this.findMedicineByName(plan.medicineQuery);
          if (byName) {
            this.applyMedicineSelection(plan, byName);
          }
        });
      },
      error: () => {
        this.errorMessage = 'Could not load medicine catalog.';
      },
    });
  }

  private openCaseById(caseId: string): void {
    const allCases = this.patientRows.flatMap((item) => item.cases);
    const found = allCases.find((item) => item.id === caseId);
    if (found) {
      const patient =
        this.patientRows.find((row) => row.patientId === found.patientId) ||
        null;
      this.selectedPatient = patient;
      this.openCase(found);
    }
  }

  private formatDatetimeLocal(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private createDosePlan(): DosePlanForm {
    return {
      medicineId: '',
      medicineQuery: '',
      medicineDescription: '',
      suggestionsOpen: false,
      morning: 1,
      afternoon: 0,
      night: 1,
      days: 7,
      doseNotes: '',
      collapsed: false,
    };
  }

  private findMedicineByName(query: string): MedicineItemResponse | undefined {
    const normalized = (query || '').trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }
    return this.medicines.find(
      (item) => item.name.trim().toLowerCase() === normalized,
    );
  }

  private applyMedicineSelection(
    plan: DosePlanForm,
    medicine: MedicineItemResponse,
  ): void {
    plan.medicineId = medicine.id;
    plan.medicineQuery = medicine.name;
    plan.medicineDescription = medicine.description || '';
  }

  private buildPatientRows(cases: MedicalCaseResponse[]): DoctorPatientRow[] {
    const grouped = new Map<string, MedicalCaseResponse[]>();

    cases.forEach((entry) => {
      const key = entry.patientId;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)?.push(entry);
    });

    return Array.from(grouped.entries()).map(([patientId, patientCases]) => {
      const sorted = [...patientCases].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      const latest = sorted[0];
      return {
        patientId,
        firstName: 'Loading...',
        lastName: '',
        latestCaseName: latest?.name || '-',
        lastCaseDate: latest?.createdAt || '',
        totalCases: patientCases.length,
        cases: sorted,
      };
    });
  }

  getFirstCharacter(firstName: string): string {
    return firstName && firstName.length > 0 ? firstName[0].toUpperCase() : 'P';
  }

  getFilteredDetails(): MedicalCaseDetailItem[] {
    return (
      this.selectedCaseDetails?.details?.filter((d) => {
        const isDosage =
          d.type === 'treatment' &&
          (d.name || '').trim().toLowerCase() === 'dosage';
        return !isDosage;
      }) || []
    );
  }

  private normalizeUuid(value: string): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim().toLowerCase();
    const canonicalPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    if (canonicalPattern.test(trimmed)) {
      return trimmed;
    }

    const hexWithoutPrefix = trimmed.startsWith('0x')
      ? trimmed.slice(2)
      : trimmed;
    const compactPattern = /^[0-9a-f]{32}$/;
    if (!compactPattern.test(hexWithoutPrefix)) {
      return null;
    }

    return `${hexWithoutPrefix.slice(0, 8)}-${hexWithoutPrefix.slice(8, 12)}-${hexWithoutPrefix.slice(12, 16)}-${hexWithoutPrefix.slice(16, 20)}-${hexWithoutPrefix.slice(20, 32)}`;
  }

  private prefetchDoctorNames(details: MedicalCaseDetailItem[]): void {
    const uniqueDoctorIds = Array.from(
      new Set(
        details
          .map((detail) => detail.doctorId)
          .filter((doctorId): doctorId is string => !!doctorId),
      ),
    );

    uniqueDoctorIds.forEach((doctorId) => {
      if (this.doctorDisplayNameById[doctorId]) {
        return;
      }

      this.userService.getUserById(doctorId).subscribe({
        next: (profile) => {
          this.doctorDisplayNameById[doctorId] =
            this.buildDoctorDisplayName(profile);
        },
        error: () => {
          this.doctorDisplayNameById[doctorId] = `Dr. ${doctorId.slice(0, 8)}`;
        },
      });
    });
  }

  private buildDoctorDisplayName(profile: UserLookupResponse): string {
    const firstName = (profile.firstName || '').trim();
    const lastName = (profile.lastName || '').trim();

    if (firstName || lastName) {
      return `Dr. ${`${firstName} ${lastName}`.trim()}`;
    }

    const fallback =
      (profile.name || profile.labName || profile.companyName || '').trim() ||
      (profile.email || '').split('@')[0] ||
      profile.id.slice(0, 8);

    return `Dr. ${fallback}`;
  }

  private toDatetimeLocalValue(value?: string): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private toEditableDosageRow(row: DosageItemResponse): EditableDosageRow {
    const parsed = new Date(row.time);
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');

    return {
      id: row.id,
      medicineId: row.medicineId,
      medicineName: this.getMedicineNameById(row.medicineId),
      quantity: row.quantity,
      doseNotes: row.doseNotes || '',
      dateValue: `${year}-${month}-${day}`,
      period: this.resolvePeriodFromDate(parsed),
      taken: !!row.taken,
    };
  }

  private resolvePeriodFromDate(
    value: Date,
  ): 'morning' | 'afternoon' | 'night' {
    const hour = value.getHours();

    if (hour <= 10) {
      return 'morning';
    }
    if (hour <= 16) {
      return 'afternoon';
    }
    return 'night';
  }

  private combineDateAndPeriodToIso(
    dateValue: string,
    period: 'morning' | 'afternoon' | 'night',
  ): string {
    const [year, month, day] = dateValue.split('-').map((part) => Number(part));
    const hour = period === 'morning' ? 8 : period === 'afternoon' ? 14 : 20;
    return new Date(year, (month || 1) - 1, day || 1, hour, 0, 0).toISOString();
  }

  private getMedicineNameById(medicineId: string): string {
    return (
      this.medicines.find((item) => item.id === medicineId)?.name ||
      'Unknown medicine'
    );
  }
}
