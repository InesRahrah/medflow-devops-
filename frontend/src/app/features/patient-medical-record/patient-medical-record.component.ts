import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import {
  LaboratoryDirectoryResponse,
  UserService,
  UserLookupResponse,
} from '../../core/services/user.service';
import {
  AssignLabToRequestRequest,
  DosageItemResponse,
  DmrService,
  MedicalCaseDetailItem,
  MedicalCaseResponse,
} from '../../core/services/dmr.service';
import { forkJoin } from 'rxjs';
import {
  BodyScanLayer,
  LabScanSelection,
  parseLabRequestNotes,
} from '../../shared/utils/lab-scan-metadata';

interface CaseDetail {
  id?: string;
  doctorId?: string;
  laboId?: string;
  labRequestId?: string;
  type: 'consultation' | 'lab_request' | 'lab_results' | 'treatment' | string;
  status?: string;
  name: string;
  involvedPersonnel: string;
  additionalInfo?: string;
  fileUrl?: string;
  date?: string;
}

interface MedicalCaseWithDetails {
  id: string;
  caseNumber: string;
  caseName: string;
  date: string;
  details: CaseDetail[];
}

interface CaseStepDosageRow {
  id: string;
  medicineName: string;
  quantity: string;
  time: string;
  taken: boolean;
  doseNotes?: string;
}

@Component({
  selector: 'app-patient-medical-record',
  templateUrl: './patient-medical-record.component.html',
  styleUrls: ['./patient-medical-record.component.css'],
})
export class PatientMedicalRecordComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  isPatient = false;
  userName = 'Patient';
  loading = false;
  errorMessage = '';
  patientId = '';
  activeView: 'cases' | 'treatment' = 'cases';
  private isTimelinePointerDown = false;
  private suppressNextTimelineClick = false;
  isDraggingTimeline = false;
  isDraggingCases = false;
  selectedCaseId: string | null = null;
  private readonly userDisplayNameById: Record<string, string> = {};
  private readonly userProfileById: Record<string, UserLookupResponse> = {};
  showCaseDetailModal = false;
  selectedCaseStepDetail: CaseDetail | null = null;
  selectedCaseStepDoctor: UserLookupResponse | null = null;
  loadingCaseStepDoctor = false;
  loadingPrescriptionStepDosages = false;
  caseStepModalError = '';
  prescriptionStepDosages: CaseStepDosageRow[] = [];
  laboratories: LaboratoryDirectoryResponse[] = [];
  loadingLaboratories = false;
  selectedLaboIdForRequest = '';
  assigningLaboratory = false;
  assignLaboratoryError = '';
  selectedLabRequestScanSelection: LabScanSelection | null = null;
  readonly defaultScanLayers: BodyScanLayer[] = ['surface'];
  private dragStartX = 0;
  private dragStartScrollLeft = 0;
  private timelineHasDragged = false;
  private casesPointerDownTime = 0;
  private casesHasDragged = false;
  private suppressNextCaseClick = false;
  private readonly caseClickMaxMs = 360;
  private readonly caseDragThresholdPx = 8;

  medicalCases: MedicalCaseWithDetails[] = [];

  constructor(
    private authService: AuthService,
    private dmrService: DmrService,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    const token = this.authService.decodeToken();
    const role = this.authService.getUserRole().toUpperCase();

    this.isLoggedIn = !!token;
    this.isPatient = role === 'PATIENT';
    this.patientId = this.authService.getPatientEntityIdAsString() || '';

    const firstName = this.authService.getUserFirstName();
    this.userName = firstName || 'Patient';

    if (this.isLoggedIn && this.isPatient && this.patientId) {
      this.loadMedicalCases();
      this.loadLaboratories();
    }
  }

  ngOnDestroy(): void {
    this.setPageScrollLocked(false);
  }

  loadMedicalCases(): void {
    this.loading = true;
    this.errorMessage = '';

    this.dmrService.getPatientMedicalCases(this.patientId).subscribe({
      next: (cases) => {
        this.medicalCases = cases.map((entry, index) => ({
          id: entry.id,
          caseNumber: `#${String(index + 1).padStart(3, '0')}`,
          caseName: entry.name,
          date: entry.startDate,
          details: [],
        }));

        this.loading = false;

        if (this.medicalCases.length > 0) {
          this.selectedCaseId = this.medicalCases[0].id;
          this.loadCaseDetails(this.medicalCases[0].id);
        }
      },
      error: () => {
        this.errorMessage = 'Failed to load your medical records.';
        this.loading = false;
      },
    });
  }

  loadCaseDetails(caseId: string): void {
    this.dmrService.getMedicalCaseDetails(caseId).subscribe({
      next: (response) => {
        const currentCase = this.medicalCases.find(
          (item) => item.id === caseId,
        );
        if (!currentCase) {
          return;
        }

        currentCase.details = response.details.map(
          (detail: MedicalCaseDetailItem) => ({
            id: detail.id,
            doctorId: detail.doctorId,
            laboId: detail.laboId,
            labRequestId: detail.labRequestId,
            type: detail.type,
            status: detail.status,
            name: detail.name,
            involvedPersonnel: detail.involvedPersonnel,
            additionalInfo: detail.additionalInfo,
            fileUrl: detail.fileUrl,
            date: detail.date,
          }),
        );

        this.prefetchDisplayNames(currentCase.details);
      },
      error: () => {
        this.errorMessage = 'Failed to load case details.';
      },
    });
  }

  selectCase(caseId: string): void {
    if (this.suppressNextCaseClick) {
      this.suppressNextCaseClick = false;
      return;
    }

    this.selectedCaseId = caseId;

    const selected = this.medicalCases.find((item) => item.id === caseId);
    if (selected && selected.details.length === 0) {
      this.loadCaseDetails(caseId);
    }
  }

  onCaseCardClick(caseId: string): void {
    this.selectCase(caseId);
  }

  getCaseStartDate(medCase: MedicalCaseWithDetails): Date {
    return new Date(medCase.date);
  }

  getCaseEndDate(medCase: MedicalCaseWithDetails): Date {
    const timestamps = medCase.details
      .map((detail) => detail.date)
      .filter((date): date is string => !!date)
      .map((date) => new Date(date).getTime())
      .filter((value) => !Number.isNaN(value));

    if (timestamps.length === 0) {
      return new Date(medCase.date);
    }

    return new Date(Math.max(...timestamps));
  }

  get selectedCaseDetails(): CaseDetail[] {
    if (!this.selectedCaseId) {
      return [];
    }
    const selectedCase = this.medicalCases.find(
      (c) => c.id === this.selectedCaseId,
    );
    return selectedCase?.details || [];
  }

  get selectedCaseDisplayDetails(): CaseDetail[] {
    return this.selectedCaseDetails.filter((detail) => {
      const isDosage =
        detail.type === 'treatment' &&
        (detail.name || '').trim().toLowerCase() === 'dosage';
      return !isDosage;
    });
  }

  get selectedCaseName(): string {
    if (!this.selectedCaseId) {
      return '';
    }
    const selectedCase = this.medicalCases.find(
      (c) => c.id === this.selectedCaseId,
    );
    return selectedCase?.caseName || '';
  }

  toggleCaseExpansion(caseId: string): void {
    this.selectCase(caseId);
  }

  onCaseStepClick(detail: CaseDetail): void {
    if (this.suppressNextTimelineClick) {
      this.suppressNextTimelineClick = false;
      return;
    }

    this.selectedCaseStepDetail = detail;
    this.showCaseDetailModal = true;
    this.setPageScrollLocked(true);
    this.selectedCaseStepDoctor = null;
    this.loadingCaseStepDoctor = false;
    this.loadingPrescriptionStepDosages = false;
    this.caseStepModalError = '';
    this.prescriptionStepDosages = [];
    this.assignLaboratoryError = '';
    this.assigningLaboratory = false;
    this.selectedLaboIdForRequest = detail.laboId || '';
    this.selectedLabRequestScanSelection =
      this.normalizeDetailType(detail.type) === 'lab_request'
        ? parseLabRequestNotes(detail.additionalInfo || '').selection
        : null;
    this.loadDoctorForCaseStep(detail);
    this.loadPrescriptionDosagesForCaseStep(detail);
  }

  closeCaseStepModal(): void {
    this.showCaseDetailModal = false;
    this.setPageScrollLocked(false);
    this.selectedCaseStepDetail = null;
    this.selectedCaseStepDoctor = null;
    this.loadingCaseStepDoctor = false;
    this.loadingPrescriptionStepDosages = false;
    this.caseStepModalError = '';
    this.prescriptionStepDosages = [];
    this.assignLaboratoryError = '';
    this.assigningLaboratory = false;
    this.selectedLaboIdForRequest = '';
    this.selectedLabRequestScanSelection = null;
  }

  onCaseStepModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeCaseStepModal();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.showCaseDetailModal) {
      this.closeCaseStepModal();
    }
  }

  getCaseStepDoctorName(detail: CaseDetail): string {
    const doctorId = this.getDoctorIdFromDetail(detail);
    if (doctorId && this.userDisplayNameById[doctorId]) {
      return this.userDisplayNameById[doctorId];
    }
    return this.formatInvolvedPersonnel(detail.involvedPersonnel) || 'Doctor';
  }

  getCaseStepDoctorId(detail: CaseDetail): string | null {
    return this.getDoctorIdFromDetail(detail);
  }

  getDoctorAffiliation(profile: UserLookupResponse | null): string {
    if (!profile) {
      return 'Medflow Care Team';
    }

    const candidates = [profile.companyName, profile.labName, profile.name]
      .map((value) => (value || '').trim())
      .filter((value) => !!value);

    return candidates[0] || 'Medflow Care Team';
  }

  getDoctorSpecialty(profile: UserLookupResponse | null): string {
    if (!profile) {
      return 'Specialty not specified';
    }

    const specialty = [
      profile.specialization,
      profile.specialty,
      profile.speciality,
      profile.department,
    ]
      .map((value) => (value || '').trim())
      .find((value) => !!value);

    return specialty || 'Specialty not specified';
  }

  getCaseStepContribution(detail: CaseDetail): string {
    const type = this.normalizeDetailType(detail.type);
    switch (type) {
      case 'consultation':
        return 'Reviewed your consultation and documented findings';
      case 'lab_request':
        return 'Requested lab tests for your diagnosis workflow';
      case 'lab_results':
        return 'Added and reviewed your lab results';
      case 'lab_detail':
        return 'Added and reviewed your lab details';
      case 'treatment':
        return 'Prepared and adjusted your treatment plan';
      default:
        return 'Contributed to this medical case step';
    }
  }

  getLabRequestStatusLabel(detail: CaseDetail | null): string {
    if (!detail) {
      return '';
    }

    const status = (detail.status || '').toUpperCase();
    switch (status) {
      case 'CREATED':
        return 'Waiting for laboratory selection';
      case 'PENDING':
        return 'Pending laboratory result';
      case 'COMPLETED':
        return 'Completed';
      default:
        return status || 'Unknown';
    }
  }

  canAssignLaboratory(detail: CaseDetail | null): boolean {
    if (!detail || this.normalizeDetailType(detail.type) !== 'lab_request') {
      return false;
    }

    const status = (detail.status || '').toUpperCase();
    return status === 'CREATED' || !detail.laboId;
  }

  getEligibleLaboratories(
    detail: CaseDetail | null,
  ): LaboratoryDirectoryResponse[] {
    if (!detail) {
      return [];
    }

    const requestedType = (detail.name || '').trim();
    if (!requestedType) {
      return this.laboratories;
    }

    return this.laboratories.filter((lab) =>
      this.supportsRequestedService(lab.supportedTests || '', requestedType),
    );
  }

  getEligibleLaboratoryOptions(
    detail: CaseDetail | null,
  ): Array<{ label: string; value: string }> {
    return this.getEligibleLaboratories(detail).map((lab) => ({
      label: (lab.labName || lab.email || 'Laboratory').trim(),
      value: lab.id,
    }));
  }

  assignLaboratoryToCurrentRequest(): void {
    const detail = this.selectedCaseStepDetail;
    if (!detail?.id || !this.patientId || !this.selectedLaboIdForRequest) {
      this.assignLaboratoryError = 'Please select a laboratory first.';
      return;
    }

    const payload: AssignLabToRequestRequest = {
      patientId: this.patientId,
      laboId: this.selectedLaboIdForRequest,
    };

    this.assigningLaboratory = true;
    this.assignLaboratoryError = '';

    this.dmrService.assignLabToRequest(detail.id, payload).subscribe({
      next: () => {
        this.assigningLaboratory = false;
        detail.status = 'PENDING';
        detail.laboId = this.selectedLaboIdForRequest;
        if (this.selectedCaseId) {
          this.loadCaseDetails(this.selectedCaseId);
        }
      },
      error: () => {
        this.assigningLaboratory = false;
        this.assignLaboratoryError =
          'Could not assign this request to the selected laboratory.';
      },
    });
  }

  getResultFileUrl(detail: CaseDetail | null): string {
    return (detail?.fileUrl || '').trim();
  }

  getCaseStepDisplayNotes(detail: CaseDetail | null): string {
    if (!detail) {
      return '';
    }

    if (this.normalizeDetailType(detail.type) === 'lab_request') {
      return parseLabRequestNotes(detail.additionalInfo || '').cleanNotes;
    }

    return (detail.additionalInfo || '').trim();
  }

  hasCaseStepScanSelection(detail: CaseDetail | null): boolean {
    if (!detail || this.normalizeDetailType(detail.type) !== 'lab_request') {
      return false;
    }

    return !!this.selectedLabRequestScanSelection;
  }

  getDosePeriodLabel(time: string): string {
    const parsed = new Date(time);
    if (Number.isNaN(parsed.getTime())) {
      return 'Period';
    }

    const hour = parsed.getHours();
    if (hour < 12) {
      return 'Morning';
    }
    if (hour < 18) {
      return 'Afternoon';
    }
    return 'Night';
  }

  private loadDoctorForCaseStep(detail: CaseDetail): void {
    const doctorId = this.getDoctorIdFromDetail(detail);
    if (!doctorId) {
      return;
    }

    if (this.userProfileById[doctorId]) {
      this.selectedCaseStepDoctor = this.userProfileById[doctorId];
      return;
    }

    this.loadingCaseStepDoctor = true;
    this.userService.getUserById(doctorId).subscribe({
      next: (profile) => {
        this.userProfileById[doctorId] = profile;
        this.userDisplayNameById[doctorId] =
          this.getDisplayName(profile) || 'Doctor';
        this.selectedCaseStepDoctor = profile;
        this.loadingCaseStepDoctor = false;
      },
      error: () => {
        this.caseStepModalError =
          this.caseStepModalError || 'Some care details could not be loaded.';
        this.loadingCaseStepDoctor = false;
      },
    });
  }

  private loadPrescriptionDosagesForCaseStep(detail: CaseDetail): void {
    const detailType = (detail.type || '').toLowerCase();
    if (detailType !== 'treatment' || !detail.id) {
      return;
    }

    this.loadingPrescriptionStepDosages = true;
    forkJoin({
      dosages: this.dmrService.getPrescriptionDosages(detail.id),
      medicines: this.dmrService.getMedicines(),
    }).subscribe({
      next: ({ dosages, medicines }) => {
        const medicineNameById = new Map<string, string>(
          medicines.map((medicine) => [medicine.id, medicine.name]),
        );

        this.prescriptionStepDosages = dosages.map(
          (dose: DosageItemResponse) => ({
            id: dose.id,
            medicineName: medicineNameById.get(dose.medicineId) || 'Medicine',
            quantity: dose.quantity,
            time: dose.time,
            taken: dose.taken,
            doseNotes: dose.doseNotes,
          }),
        );

        this.loadingPrescriptionStepDosages = false;
      },
      error: () => {
        this.prescriptionStepDosages = [];
        this.loadingPrescriptionStepDosages = false;
        this.caseStepModalError =
          this.caseStepModalError ||
          'Prescription doses could not be loaded for this step.';
      },
    });
  }

  private loadLaboratories(): void {
    this.loadingLaboratories = true;
    this.userService.getLaboratories().subscribe({
      next: (labs) => {
        this.laboratories = labs || [];
        this.loadingLaboratories = false;
      },
      error: () => {
        this.laboratories = [];
        this.loadingLaboratories = false;
      },
    });
  }

  private supportsRequestedService(
    supportedTests: string,
    requestedType: string,
  ): boolean {
    const requested = this.normalizeServiceToken(requestedType);
    if (!requested) {
      return false;
    }

    const tokens = (supportedTests || '').split(/[,;|\n]/g);
    for (const token of tokens) {
      const normalizedToken = this.normalizeServiceToken(token);
      if (!normalizedToken) {
        continue;
      }

      if (
        normalizedToken === requested ||
        normalizedToken.includes(requested) ||
        requested.includes(normalizedToken)
      ) {
        return true;
      }
    }

    return false;
  }

  private normalizeServiceToken(value: string): string {
    return (value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private getDoctorIdFromDetail(detail: CaseDetail): string | null {
    if (detail.doctorId) {
      return detail.doctorId.toLowerCase();
    }
    return this.extractUuid(detail.involvedPersonnel);
  }

  getDetailIcon(type: string): string {
    switch (this.normalizeDetailType(type)) {
      case 'consultation':
        return '💬';
      case 'lab_request':
        return '📋';
      case 'lab_results':
      case 'lab_detail':
        return '🧪';
      case 'treatment':
        return '💊';
      default:
        return '📄';
    }
  }

  getSvgIconPaths(type: string): string[] {
    switch (this.normalizeDetailType(type)) {
      case 'consultation':
        return [
          'M15.0007 12C15.0007 13.6569 13.6576 15 12.0007 15C10.3439 15 9.00073 13.6569 9.00073 12C9.00073 10.3431 10.3439 9 12.0007 9C13.6576 9 15.0007 10.3431 15.0007 12Z',
          'M12.0012 5C7.52354 5 3.73326 7.94288 2.45898 12C3.73324 16.0571 7.52354 19 12.0012 19C16.4788 19 20.2691 16.0571 21.5434 12C20.2691 7.94291 16.4788 5 12.0012 5Z',
        ];
      case 'lab_request':
        return [
          'M14.2639 15.9376L12.5958 14.2835C11.7909 13.4852 11.3884 13.0861 10.9266 12.9402C10.5204 12.8119 10.0838 12.8166 9.68048 12.9537C9.22188 13.1096 8.82814 13.5173 8.04068 14.3327L4.04409 18.2802M14.2639 15.9376L14.6053 15.5991C15.4112 14.7999 15.8141 14.4003 16.2765 14.2544C16.6831 14.1262 17.12 14.1312 17.5236 14.2688C17.9824 14.4252 18.3761 14.834 19.1634 15.6515L20 16.4936M14.2639 15.9376L18.275 19.9566M18.275 19.9566C17.9176 20.0001 17.4543 20.0001 16.8 20.0001H7.2C6.07989 20.0001 5.51984 20.0001 5.09202 19.7821C4.71569 19.5904 4.40973 19.2844 4.21799 18.9081C4.12796 18.7314 4.07512 18.5322 4.04409 18.2802M18.275 19.9566C18.5293 19.9257 18.7301 19.8728 18.908 19.7821C19.2843 19.5904 19.5903 19.2844 19.782 18.9081C20 18.4803 20 17.9202 20 16.8001V16.4936M12.5 4L7.2 4.00011C6.07989 4.00011 5.51984 4.00011 5.09202 4.21809C4.71569 4.40984 4.40973 4.7158 4.21799 5.09213C4 5.51995 4 6.08 4 7.20011V16.8001C4 17.4576 4 17.9222 4.04409 18.2802M20 11.5V16.4936M14 10.0002L16.0249 9.59516C16.2015 9.55984 16.2898 9.54219 16.3721 9.5099C16.4452 9.48124 16.5146 9.44407 16.579 9.39917C16.6515 9.34859 16.7152 9.28492 16.8425 9.1576L21 5.00015C21.5522 4.44787 21.5522 3.55244 21 3.00015C20.4477 2.44787 19.5522 2.44787 19 3.00015L14.8425 7.1576C14.7152 7.28492 14.6515 7.34859 14.6009 7.42112C14.556 7.4855 14.5189 7.55494 14.4902 7.62801C14.4579 7.71033 14.4403 7.79862 14.4049 7.97518L14 10.0002Z',
        ];
      case 'lab_results':
      case 'lab_detail':
        return [
          'M14.2647 15.9377L12.5473 14.2346C11.758 13.4519 11.3633 13.0605 10.9089 12.9137C10.5092 12.7845 10.079 12.7845 9.67922 12.9137C9.22485 13.0605 8.83017 13.4519 8.04082 14.2346L4.04193 18.2622M14.2647 15.9377L14.606 15.5991C15.412 14.7999 15.8149 14.4003 16.2773 14.2545C16.6839 14.1262 17.1208 14.1312 17.5244 14.2688C17.9832 14.4253 18.3769 14.834 19.1642 15.6515L20 16.5001M14.2647 15.9377L18.22 19.9628M11 4H7.2C6.07989 4 5.51984 4 5.09202 4.21799C4.7157 4.40973 4.40973 4.71569 4.21799 5.09202C4 5.51984 4 6.0799 4 7.2V16.8C4 17.4466 4 17.9066 4.04193 18.2622M4.04193 18.2622C4.07264 18.5226 4.12583 18.7271 4.21799 18.908C4.40973 19.2843 4.7157 19.5903 5.09202 19.782C5.51984 20 6.07989 20 7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V13M15 5.28571L16.8 7L21 3',
        ];
      case 'treatment':
        return [
          'M15.5005 8.50004L8.50053 15.5M11.5005 4.50004L19.5005 12.5C21.4335 14.433 21.4335 17.567 19.5005 19.5C17.5675 21.433 14.4335 21.433 12.5005 19.5L4.50053 11.5C2.56753 9.56704 2.56753 6.43304 4.50053 4.50004C6.43353 2.56704 9.56753 2.56704 11.5005 4.50004Z',
        ];
      default:
        return ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8'];
    }
  }

  getDetailLabel(type: string): string {
    switch (this.normalizeDetailType(type)) {
      case 'consultation':
        return 'Consultation';
      case 'lab_request':
        return 'Lab Request';
      case 'lab_results':
        return 'Lab Results';
      case 'lab_detail':
        return 'Lab Detail';
      case 'treatment':
        return 'Treatment';
      default:
        return 'Detail';
    }
  }

  private normalizeDetailType(type: string): string {
    const value = (type || '').toLowerCase();
    if (value === 'imaging_request') return 'lab_request';
    if (value === 'imaging_results') return 'lab_results';
    if (value === 'lab_dtail') return 'lab_detail';
    return value;
  }

  formatInvolvedPersonnel(value: string): string {
    if (!value) {
      return '';
    }

    const normalizedId = this.extractUuid(value);
    const resolvedName = normalizedId
      ? this.userDisplayNameById[normalizedId]
      : '';

    const withName =
      normalizedId && resolvedName
        ? value.replace(new RegExp(normalizedId, 'ig'), resolvedName)
        : value;

    const uuidPattern =
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
    const compactUuidPattern = /\b0x[0-9a-f]{32}\b/gi;

    const cleaned = withName
      .replace(compactUuidPattern, '')
      .replace(uuidPattern, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s*\n\s*/g, ' ')
      .trim();

    return cleaned || 'Care Team';
  }

  private prefetchDisplayNames(details: CaseDetail[]): void {
    const ids = details
      .map((detail) => this.getDoctorIdFromDetail(detail))
      .filter((id): id is string => !!id)
      .filter((id) => !this.userDisplayNameById[id]);

    const uniqueIds = Array.from(new Set(ids));
    uniqueIds.forEach((id) => {
      this.userService.getUserById(id).subscribe({
        next: (profile) => {
          this.userProfileById[id] = profile;
          this.userDisplayNameById[id] =
            this.getDisplayName(profile) || 'Doctor';
        },
        error: () => {
          this.userDisplayNameById[id] = 'Doctor';
        },
      });
    });
  }

  private extractUuid(value: string): string | null {
    if (!value) {
      return null;
    }

    const canonicalMatch = value.match(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
    );
    if (canonicalMatch?.[0]) {
      return canonicalMatch[0].toLowerCase();
    }

    const compactMatch = value.match(/\b0x([0-9a-f]{32})\b/i);
    if (!compactMatch?.[1]) {
      return null;
    }

    const hex = compactMatch[1].toLowerCase();
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  getDisplayName(profile: UserLookupResponse): string {
    const firstName = (profile.firstName || '').trim();
    const lastName = (profile.lastName || '').trim();
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }

    if ((profile.name || '').trim()) {
      return (profile.name || '').trim();
    }
    if ((profile.labName || '').trim()) {
      return (profile.labName || '').trim();
    }
    if ((profile.companyName || '').trim()) {
      return (profile.companyName || '').trim();
    }

    const emailPrefix = (profile.email || '').split('@')[0]?.trim();
    return emailPrefix || 'Doctor';
  }

  startTimelineDrag(event: PointerEvent, timeline: HTMLElement): void {
    if (event.pointerType !== 'mouse') {
      return;
    }

    this.isTimelinePointerDown = true;
    this.isDraggingTimeline = false;
    this.timelineHasDragged = false;
    this.dragStartX = event.clientX - timeline.getBoundingClientRect().left;
    this.dragStartScrollLeft = timeline.scrollLeft;
  }

  startCasesDrag(event: PointerEvent, casesTrack: HTMLElement): void {
    if (event.pointerType !== 'mouse') {
      return;
    }

    this.isDraggingCases = true;
    this.casesHasDragged = false;
    this.casesPointerDownTime = performance.now();
    this.dragStartX = event.clientX - casesTrack.getBoundingClientRect().left;
    this.dragStartScrollLeft = casesTrack.scrollLeft;
  }

  onTimelineDrag(event: PointerEvent, timeline: HTMLElement): void {
    if (!this.isTimelinePointerDown || event.pointerType !== 'mouse') {
      return;
    }

    const currentX = event.clientX - timeline.getBoundingClientRect().left;
    const dragDelta = currentX - this.dragStartX;
    const dragDistance = Math.abs(dragDelta);

    if (!this.timelineHasDragged && dragDistance < this.caseDragThresholdPx) {
      return;
    }

    if (!this.timelineHasDragged) {
      this.timelineHasDragged = true;
      this.isDraggingTimeline = true;
      timeline.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    timeline.scrollLeft = this.dragStartScrollLeft - dragDelta;
  }

  onCasesDrag(event: PointerEvent, casesTrack: HTMLElement): void {
    if (!this.isDraggingCases) {
      return;
    }

    const currentX = event.clientX - casesTrack.getBoundingClientRect().left;
    const dragDelta = currentX - this.dragStartX;
    const dragDistance = Math.abs(dragDelta);

    if (!this.casesHasDragged && dragDistance < this.caseDragThresholdPx) {
      return;
    }

    if (!this.casesHasDragged) {
      casesTrack.setPointerCapture(event.pointerId);
    }

    this.casesHasDragged = true;
    event.preventDefault();
    casesTrack.scrollLeft = this.dragStartScrollLeft - dragDelta;
  }

  stopTimelineDrag(event: PointerEvent, timeline: HTMLElement): void {
    if (!this.isTimelinePointerDown) {
      return;
    }

    if (timeline.hasPointerCapture(event.pointerId)) {
      timeline.releasePointerCapture(event.pointerId);
    }
    this.suppressNextTimelineClick = this.timelineHasDragged;
    this.isTimelinePointerDown = false;
    this.isDraggingTimeline = false;
    this.timelineHasDragged = false;
  }

  stopCasesDrag(event: PointerEvent, casesTrack: HTMLElement): void {
    if (!this.isDraggingCases) {
      return;
    }

    if (casesTrack.hasPointerCapture(event.pointerId)) {
      casesTrack.releasePointerCapture(event.pointerId);
    }

    const clickDurationMs = performance.now() - this.casesPointerDownTime;
    const shouldSelect =
      !this.casesHasDragged && clickDurationMs <= this.caseClickMaxMs;

    if (!shouldSelect) {
      this.suppressNextCaseClick = true;
    } else {
      this.suppressNextCaseClick = false;
    }

    this.isDraggingCases = false;
    this.casesHasDragged = false;
  }

  private setPageScrollLocked(locked: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    const value = locked ? 'hidden' : '';
    document.body.style.overflow = value;
    document.documentElement.style.overflow = value;
  }
}
