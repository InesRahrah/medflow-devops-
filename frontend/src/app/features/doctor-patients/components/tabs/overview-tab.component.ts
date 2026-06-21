import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  DmrService,
  DosageItemResponse,
  MedicalCaseDetailItem,
  MedicineItemResponse,
} from '../../../../core/services/dmr.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  UserLookupResponse,
  UserService,
} from '../../../../core/services/user.service';
import { LAB_SERVICE_TYPE_OPTIONS } from '../../constants/lab-service-types';
import {
  BodyScanLayer,
  LabScanSelection,
  buildLabRequestNotes,
  isImagingLabServiceType,
  parseLabRequestNotes,
} from '../../../../shared/utils/lab-scan-metadata';

type DoseTimePeriod = 'morning' | 'afternoon' | 'night';

interface OverviewTimelineItem {
  id: string;
  rawType: string;
  rawNotes: string;
  doctorId: string;
  doctorLabel: string;
  canEdit: boolean;
  fileUrl: string;
  typeLabel: string;
  badgeKey:
    | 'consultation'
    | 'lab-request'
    | 'lab-result'
    | 'prescription'
    | 'activity';
  title: string;
  notes: string;
  date: string;
  scanSelection: LabScanSelection | null;
}

interface PrescriptionModalDoseItem {
  id: string;
  medicineName: string;
  quantity: number;
  date: string;
  period: DoseTimePeriod;
  notes: string;
  taken: boolean;
}

@Component({
  selector: 'app-overview-tab',
  templateUrl: './overview-tab.component.html',
  styleUrl: './overview-tab.component.css',
})
export class OverviewTabComponent implements OnInit, OnChanges, OnDestroy {
  @Input() patientId: string | null = null;
  @Input() caseId: string | null = null;

  loadingPrescriptions = true;
  alerts: any[] = [];
  timeline: OverviewTimelineItem[] = [];
  timelineError = '';
  savingTimelineEdit = false;
  showTimelineEditModal = false;
  activeEditEvent: OverviewTimelineItem | null = null;
  showPrescriptionModal = false;
  prescriptionModalLoading = false;
  savingPrescriptionModal = false;
  prescriptionModalError = '';
  activePrescriptionEvent: OverviewTimelineItem | null = null;
  prescriptionModalDoses: PrescriptionModalDoseItem[] = [];
  prescriptionModalNotes = '';
  prescriptionModalNotesTouched = false;
  showDeleteConfirmModal = false;
  deletingTimelineItem = false;
  deleteTargetEvent: OverviewTimelineItem | null = null;
  showScanSelectionModal = false;
  scanSelectionModalEvent: OverviewTimelineItem | null = null;
  timelineEditTitleTouched = false;
  timelineEditDateTouched = false;
  timelineEditNotesTouched = false;
  private prescriptionDoseDateTouched = new Set<string>();
  private prescriptionDoseNotesTouched = new Set<string>();
  editForm = {
    title: '',
    notes: '',
    date: '',
  };
  readonly defaultScanLayers: BodyScanLayer[] = ['surface'];

  readonly dosePeriodOptions = [
    { label: 'Morning', value: 'morning' },
    { label: 'Afternoon', value: 'afternoon' },
    { label: 'Night', value: 'night' },
  ];

  readonly testTypeOptions = LAB_SERVICE_TYPE_OPTIONS;

  private loggedInDoctorId = '';
  private readonly timelineTitleMaxLength = 80;
  private readonly notesMinLength = 3;
  private readonly timelineNotesMaxLength = 1000;
  private readonly prescriptionNotesMaxLength = 1000;
  private readonly doseNotesMaxLength = 280;
  private doctorNameById: Record<string, string> = {};
  private currentTimelineRequestId = 0;
  private medicineNameById: Record<string, string> = {};
  private hasBodyScrollLock = false;
  private readonly modalLockKey = 'modalLockCount';

  private destroy$ = new Subject<void>();

  constructor(
    private dmrService: DmrService,
    private authService: AuthService,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.loggedInDoctorId = this.authService.getUserIdAsString() || '';

    if (this.caseId) {
      this.loadCaseTimeline(this.caseId);
    } else {
      this.loadingPrescriptions = false;
    }

    // TODO: Load alerts from backend when API is available
    this.loadAlerts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['caseId'] && !changes['caseId'].firstChange) {
      this.loadCaseTimeline(this.caseId);
    }
  }

  private loadCaseTimeline(caseId: string | null): void {
    if (!caseId) {
      this.timeline = [];
      this.loadingPrescriptions = false;
      return;
    }

    const requestId = ++this.currentTimelineRequestId;
    this.loadingPrescriptions = true;
    this.timelineError = '';
    this.showTimelineEditModal = false;
    this.activeEditEvent = null;
    this.showPrescriptionModal = false;
    this.showDeleteConfirmModal = false;
    this.showScanSelectionModal = false;
    this.scanSelectionModalEvent = null;
    this.updateModalScrollLock();

    this.dmrService
      .getMedicalCaseDetails(caseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details) => {
          if (requestId !== this.currentTimelineRequestId) {
            return;
          }

          const detailItems = details?.details || [];
          this.timeline = this.mapTimelineEvents(detailItems);
          this.prefetchDoctorNames(detailItems);
          this.loadingPrescriptions = false;
        },
        error: () => {
          if (requestId !== this.currentTimelineRequestId) {
            return;
          }

          this.timeline = [];
          this.timelineError = 'Could not load case timeline.';
          this.loadingPrescriptions = false;
        },
      });
  }

  private mapTimelineEvents(
    items: MedicalCaseDetailItem[],
  ): OverviewTimelineItem[] {
    return (items || [])
      .filter((item) => this.isTimelineActivity(item))
      .map((item, index) => {
        const normalizedType = (item.type || '').toLowerCase();
        const badgeKey = this.getTimelineBadgeKey(normalizedType);
        const parsedNotes = parseLabRequestNotes(item.additionalInfo || '');
        const rawNotes = (item.additionalInfo || '').trim();

        return {
          id: item.id || `${normalizedType}-${item.date || 'unknown'}-${index}`,
          rawType: normalizedType,
          rawNotes,
          doctorId: item.doctorId || '',
          doctorLabel: this.resolveDoctorLabel(
            item.doctorId || '',
            item.involvedPersonnel || '',
          ),
          canEdit: this.canEditTimelineItem(item),
          fileUrl: (item.fileUrl || '').trim(),
          typeLabel: this.getTimelineTypeLabel(normalizedType),
          badgeKey,
          title:
            (item.name || '').trim() ||
            this.getTimelineTypeLabel(normalizedType),
          notes: parsedNotes.cleanNotes || 'No additional notes.',
          date: item.date || '',
          scanSelection:
            normalizedType === 'lab_request' ? parsedNotes.selection : null,
        };
      })
      .sort(
        (a, b) => this.getDateSortValue(b.date) - this.getDateSortValue(a.date),
      );
  }

  private isTimelineActivity(item: MedicalCaseDetailItem): boolean {
    const type = (item.type || '').toLowerCase();
    if (!type) {
      return false;
    }

    if (type === 'treatment') {
      const isDosage = (item.name || '').trim().toLowerCase() === 'dosage';
      return !isDosage;
    }

    return (
      type === 'consultation' ||
      type === 'lab_request' ||
      type === 'lab_results'
    );
  }

  private getTimelineTypeLabel(type: string): string {
    if (type === 'consultation') {
      return 'Consultation';
    }
    if (type === 'lab_request') {
      return 'Lab Request';
    }
    if (type === 'lab_results') {
      return 'Lab Result';
    }
    if (type === 'treatment') {
      return 'Prescription';
    }
    return 'Case Activity';
  }

  private getTimelineBadgeKey(
    type: string,
  ):
    | 'consultation'
    | 'lab-request'
    | 'lab-result'
    | 'prescription'
    | 'activity' {
    if (type === 'consultation') {
      return 'consultation';
    }
    if (type === 'lab_request') {
      return 'lab-request';
    }
    if (type === 'lab_results') {
      return 'lab-result';
    }
    if (type === 'treatment') {
      return 'prescription';
    }
    return 'activity';
  }

  private getDateSortValue(dateValue: string): number {
    const parsed = new Date(dateValue || '').getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private canEditTimelineItem(item: MedicalCaseDetailItem): boolean {
    const type = (item.type || '').toLowerCase();
    const editableType =
      type === 'consultation' || type === 'lab_request' || type === 'treatment';

    return (
      editableType &&
      !!item.id &&
      !!item.doctorId &&
      item.doctorId === this.loggedInDoctorId
    );
  }

  private resolveDoctorLabel(doctorId: string, fallback: string): string {
    if (!doctorId) {
      return fallback || 'Doctor';
    }

    const knownName = this.doctorNameById[doctorId] || '';
    if (knownName) {
      return doctorId === this.loggedInDoctorId
        ? `${knownName} (You)`
        : knownName;
    }

    if (doctorId === this.loggedInDoctorId) {
      return 'Dr. You (You)';
    }

    return fallback || `Dr. ${doctorId.slice(0, 8)}`;
  }

  private prefetchDoctorNames(items: MedicalCaseDetailItem[]): void {
    const uniqueDoctorIds = Array.from(
      new Set(
        items
          .map((item) => item.doctorId)
          .filter((doctorId): doctorId is string => !!doctorId),
      ),
    );

    uniqueDoctorIds.forEach((doctorId) => {
      if (this.doctorNameById[doctorId]) {
        return;
      }

      this.userService
        .getUserById(doctorId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (profile: UserLookupResponse) => {
            this.doctorNameById[doctorId] =
              this.buildDoctorDisplayName(profile);
            this.refreshTimelineDoctorLabels();
          },
          error: () => {
            this.doctorNameById[doctorId] = `Dr. ${doctorId.slice(0, 8)}`;
            this.refreshTimelineDoctorLabels();
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
      profile.id;
    return `Dr. ${fallback}`;
  }

  private refreshTimelineDoctorLabels(): void {
    this.timeline = this.timeline.map((event) => ({
      ...event,
      doctorLabel: this.resolveDoctorLabel(event.doctorId, event.doctorLabel),
    }));
  }

  beginTimelineEdit(event: OverviewTimelineItem): void {
    if (!event.canEdit) {
      return;
    }

    if (event.rawType === 'treatment') {
      this.openPrescriptionModal(event);
      return;
    }

    this.timelineError = '';
    this.activeEditEvent = event;
    this.showTimelineEditModal = true;
    this.editForm = {
      title: event.title,
      notes: event.notes,
      date: this.toDatetimeLocal(event.date),
    };
    this.timelineEditTitleTouched = false;
    this.timelineEditDateTouched = false;
    this.timelineEditNotesTouched = false;
    this.updateModalScrollLock();
  }

  closeTimelineEditModal(): void {
    if (this.savingTimelineEdit) {
      return;
    }

    this.showTimelineEditModal = false;
    this.activeEditEvent = null;
    this.updateModalScrollLock();
  }

  onTimelineEditModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeTimelineEditModal();
    }
  }

  saveTimelineEdit(): void {
    const event = this.activeEditEvent;
    if (!event || !event.canEdit || !event.id || !this.loggedInDoctorId) {
      return;
    }

    if (!this.canSaveTimelineEdit) {
      this.timelineError = 'Please fix the highlighted edit fields.';
      return;
    }

    this.savingTimelineEdit = true;
    this.timelineError = '';
    const normalizedTimelineNotes = this.normalizeFreeText(
      this.editForm.notes,
      this.timelineNotesMaxLength,
    );
    this.editForm.notes = normalizedTimelineNotes;

    if (event.rawType === 'consultation') {
      const consultationDate = this.toLocalApiDateTime(this.editForm.date);
      if (!consultationDate) {
        this.timelineError = 'Consultation date is required.';
        this.savingTimelineEdit = false;
        return;
      }

      this.dmrService
        .updateConsultation(event.id, {
          doctorId: this.loggedInDoctorId,
          consultationDate,
          notes: normalizedTimelineNotes || undefined,
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.onTimelineEditSaved(),
          error: () =>
            this.onTimelineEditFailed('Could not update consultation.'),
        });
      return;
    }

    if (event.rawType === 'lab_request') {
      const testType = this.normalizeFreeText(
        this.editForm.title,
        this.timelineTitleMaxLength,
      );
      if (!testType) {
        this.timelineError = 'Service type is required.';
        this.savingTimelineEdit = false;
        return;
      }

      this.editForm.title = testType;

      this.dmrService
        .updateLabRequest(event.id, {
          doctorId: this.loggedInDoctorId,
          testType,
          notes: isImagingLabServiceType(testType)
            ? buildLabRequestNotes(normalizedTimelineNotes, event.scanSelection)
            : normalizedTimelineNotes || undefined,
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.onTimelineEditSaved(),
          error: () =>
            this.onTimelineEditFailed('Could not update lab request.'),
        });
      return;
    }

    this.savingTimelineEdit = false;
    this.closeTimelineEditModal();
  }

  openPrescriptionModal(event: OverviewTimelineItem): void {
    if (event.rawType !== 'treatment' || !event.id) {
      return;
    }

    this.showPrescriptionModal = true;
    this.activePrescriptionEvent = event;
    this.prescriptionModalLoading = true;
    this.prescriptionModalError = '';
    this.prescriptionModalDoses = [];
    this.prescriptionModalNotes =
      event.notes === 'No additional notes.' ? '' : event.notes;
    this.prescriptionModalNotesTouched = false;
    this.prescriptionDoseDateTouched.clear();
    this.prescriptionDoseNotesTouched.clear();
    this.updateModalScrollLock();

    this.dmrService
      .getPrescriptionDosages(event.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dosages) => {
          const source = dosages || [];
          this.enrichDoseMedicineNames(source, () => {
            this.prescriptionModalDoses = source.map((item) =>
              this.mapPrescriptionModalDose(item),
            );
            this.prescriptionModalLoading = false;
          });
        },
        error: () => {
          this.prescriptionModalDoses = [];
          this.prescriptionModalError = 'Could not load linked doses.';
          this.prescriptionModalLoading = false;
        },
      });
  }

  closePrescriptionModal(): void {
    if (this.savingPrescriptionModal) {
      return;
    }

    this.showPrescriptionModal = false;
    this.prescriptionModalLoading = false;
    this.savingPrescriptionModal = false;
    this.prescriptionModalError = '';
    this.prescriptionModalDoses = [];
    this.activePrescriptionEvent = null;
    this.updateModalScrollLock();
  }

  onPrescriptionModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closePrescriptionModal();
    }
  }

  savePrescriptionModal(): void {
    const target = this.activePrescriptionEvent;
    if (!target || !target.canEdit || !target.id || !this.loggedInDoctorId) {
      this.closePrescriptionModal();
      return;
    }

    if (!this.canSavePrescriptionModal) {
      this.prescriptionModalError = 'Please fix the highlighted dose fields.';
      return;
    }

    this.savingPrescriptionModal = true;
    this.prescriptionModalError = '';
    const normalizedPrescriptionNotes = this.normalizeFreeText(
      this.prescriptionModalNotes,
      this.prescriptionNotesMaxLength,
    );
    this.prescriptionModalNotes = normalizedPrescriptionNotes;

    const requests = [
      this.dmrService.updatePrescription(target.id, {
        doctorId: this.loggedInDoctorId,
        notes: normalizedPrescriptionNotes || undefined,
      }),
    ];

    for (const dose of this.prescriptionModalDoses) {
      const isoTime = this.toIsoFromDateAndPeriod(dose.date, dose.period);
      if (!isoTime) {
        this.prescriptionModalError = 'Each dose needs a valid date.';
        this.savingPrescriptionModal = false;
        return;
      }

      requests.push(
        this.dmrService.updateDosage(dose.id, {
          doctorId: this.loggedInDoctorId,
          quantity: String(Math.max(0, Number(dose.quantity) || 0)),
          doseNotes:
            this.normalizeFreeText(dose.notes, this.doseNotesMaxLength) ||
            undefined,
          time: isoTime,
          taken: !!dose.taken,
        }),
      );
    }

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.savingPrescriptionModal = false;
          this.prescriptionModalError = '';
          this.prescriptionModalNotesTouched = false;
          this.prescriptionDoseDateTouched.clear();
          this.prescriptionDoseNotesTouched.clear();
          this.closePrescriptionModal();
          this.loadCaseTimeline(this.caseId);
        },
        error: () => {
          this.prescriptionModalError = 'Could not save prescription updates.';
          this.savingPrescriptionModal = false;
        },
      });
  }

  deleteDoseFromPrescriptionModal(doseId: string): void {
    const target = this.activePrescriptionEvent;
    if (!target || !target.canEdit || !doseId || !this.loggedInDoctorId) {
      return;
    }

    if (!window.confirm('Delete this dose from the prescription?')) {
      return;
    }

    this.savingPrescriptionModal = true;
    this.prescriptionModalError = '';
    this.dmrService
      .deleteDosage(doseId, this.loggedInDoctorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.prescriptionModalDoses = this.prescriptionModalDoses.filter(
            (item) => item.id !== doseId,
          );
          this.savingPrescriptionModal = false;
        },
        error: () => {
          this.prescriptionModalError = 'Could not delete this dose.';
          this.savingPrescriptionModal = false;
        },
      });
  }

  openDeleteTimelineConfirm(event: OverviewTimelineItem): void {
    if (!event.canEdit) {
      return;
    }

    this.deleteTargetEvent = event;
    this.showDeleteConfirmModal = true;
    this.timelineError = '';
    this.updateModalScrollLock();
  }

  closeDeleteTimelineConfirm(): void {
    if (this.deletingTimelineItem) {
      return;
    }

    this.showDeleteConfirmModal = false;
    this.deleteTargetEvent = null;
    this.updateModalScrollLock();
  }

  onDeleteConfirmBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeDeleteTimelineConfirm();
    }
  }

  confirmDeleteTimelineItem(): void {
    const target = this.deleteTargetEvent;
    if (!target || !target.id || !target.canEdit || !this.loggedInDoctorId) {
      return;
    }

    this.deletingTimelineItem = true;
    this.timelineError = '';

    const onSuccess = () => {
      this.deletingTimelineItem = false;
      this.showDeleteConfirmModal = false;
      this.deleteTargetEvent = null;
      this.updateModalScrollLock();
      if (this.activePrescriptionEvent?.id === target.id) {
        this.closePrescriptionModal();
      }
      this.loadCaseTimeline(this.caseId);
    };

    const onError = () => {
      this.deletingTimelineItem = false;
      this.showDeleteConfirmModal = false;
      this.deleteTargetEvent = null;
      this.updateModalScrollLock();
      this.timelineError = this.getTimelineDeleteErrorMessage(target.rawType);
    };

    if (target.rawType === 'consultation') {
      this.dmrService
        .deleteConsultation(target.id, this.loggedInDoctorId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({ next: onSuccess, error: onError });
      return;
    }

    if (target.rawType === 'lab_request') {
      this.dmrService
        .deleteLabRequest(target.id, this.loggedInDoctorId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({ next: onSuccess, error: onError });
      return;
    }

    if (target.rawType === 'treatment') {
      this.dmrService
        .deletePrescription(target.id, this.loggedInDoctorId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({ next: onSuccess, error: onError });
      return;
    }

    onError();
  }

  getTimelineIconPaths(type: string): string[] {
    if (type === 'consultation') {
      return [
        'M15.0007 12C15.0007 13.6569 13.6576 15 12.0007 15C10.3439 15 9.00073 13.6569 9.00073 12C9.00073 10.3431 10.3439 9 12.0007 9C13.6576 9 15.0007 10.3431 15.0007 12Z',
        'M12.0012 5C7.52354 5 3.73326 7.94288 2.45898 12C3.73324 16.0571 7.52354 19 12.0012 19C16.4788 19 20.2691 16.0571 21.5434 12C20.2691 7.94291 16.4788 5 12.0012 5Z',
      ];
    }
    if (type === 'lab_request') {
      return [
        'M14.2639 15.9376L12.5958 14.2835C11.7909 13.4852 11.3884 13.0861 10.9266 12.9402C10.5204 12.8119 10.0838 12.8166 9.68048 12.9537C9.22188 13.1096 8.82814 13.5173 8.04068 14.3327L4.04409 18.2802M14.2639 15.9376L14.6053 15.5991C15.4112 14.7999 15.8141 14.4003 16.2765 14.2544C16.6831 14.1262 17.12 14.1312 17.5236 14.2688C17.9824 14.4252 18.3761 14.834 19.1634 15.6515L20 16.4936M14.2639 15.9376L18.275 19.9566M18.275 19.9566C17.9176 20.0001 17.4543 20.0001 16.8 20.0001H7.2C6.07989 20.0001 5.51984 20.0001 5.09202 19.7821C4.71569 19.5904 4.40973 19.2844 4.21799 18.9081C4.12796 18.7314 4.07512 18.5322 4.04409 18.2802M18.275 19.9566C18.5293 19.9257 18.7301 19.8728 18.908 19.7821C19.2843 19.5904 19.5903 19.2844 19.782 18.9081C20 18.4803 20 17.9202 20 16.8001V16.4936M12.5 4L7.2 4.00011C6.07989 4.00011 5.51984 4.00011 5.09202 4.21809C4.71569 4.40984 4.40973 4.7158 4.21799 5.09213C4 5.51995 4 6.08 4 7.20011V16.8001C4 17.4576 4 17.9222 4.04409 18.2802M20 11.5V16.4936M14 10.0002L16.0249 9.59516C16.2015 9.55984 16.2898 9.54219 16.3721 9.5099C16.4452 9.48124 16.5146 9.44407 16.579 9.39917C16.6515 9.34859 16.7152 9.28492 16.8425 9.1576L21 5.00015C21.5522 4.44787 21.5522 3.55244 21 3.00015C20.4477 2.44787 19.5522 2.44787 19 3.00015L14.8425 7.1576C14.7152 7.28492 14.6515 7.34859 14.6009 7.42112C14.556 7.4855 14.5189 7.55494 14.4902 7.62801C14.4579 7.71033 14.4403 7.79862 14.4049 7.97518L14 10.0002Z',
      ];
    }
    if (type === 'lab_results') {
      return [
        'M14.2647 15.9377L12.5473 14.2346C11.758 13.4519 11.3633 13.0605 10.9089 12.9137C10.5092 12.7845 10.079 12.7845 9.67922 12.9137C9.22485 13.0605 8.83017 13.4519 8.04082 14.2346L4.04193 18.2622M14.2647 15.9377L14.606 15.5991C15.412 14.7999 15.8149 14.4003 16.2773 14.2545C16.6839 14.1262 17.1208 14.1312 17.5244 14.2688C17.9832 14.4253 18.3769 14.834 19.1642 15.6515L20 16.5001M14.2647 15.9377L18.22 19.9628M11 4H7.2C6.07989 4 5.51984 4 5.09202 4.21799C4.7157 4.40973 4.40973 4.71569 4.21799 5.09202C4 5.51984 4 6.0799 4 7.2V16.8C4 17.4466 4 17.9066 4.04193 18.2622M4.04193 18.2622C4.07264 18.5226 4.12583 18.7271 4.21799 18.908C4.40973 19.2843 4.7157 19.5903 5.09202 19.782C5.51984 20 6.07989 20 7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V13M15 5.28571L16.8 7L21 3',
      ];
    }
    if (type === 'treatment') {
      return [
        'M15.5005 8.50004L8.50053 15.5M11.5005 4.50004L19.5005 12.5C21.4335 14.433 21.4335 17.567 19.5005 19.5C17.5675 21.433 14.4335 21.433 12.5005 19.5L4.50053 11.5C2.56753 9.56704 2.56753 6.43304 4.50053 4.50004C6.43353 2.56704 9.56753 2.56704 11.5005 4.50004Z',
      ];
    }
    return ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8'];
  }

  private mapPrescriptionModalDose(
    item: DosageItemResponse,
  ): PrescriptionModalDoseItem {
    const parsedTime = this.parseDate(item.time);
    return {
      id: item.id,
      medicineName:
        (
          item.medicineName ||
          this.medicineNameById[item.medicineId] ||
          ''
        ).trim() || 'Unnamed medicine',
      quantity: Math.max(0, Number(item.quantity) || 0),
      date: this.toDateInputValue(parsedTime),
      period: this.getDosePeriodFromDate(parsedTime),
      notes: item.doseNotes || '',
      taken: !!item.taken,
    };
  }

  getDosePeriodLabel(period: DoseTimePeriod): string {
    if (period === 'morning') {
      return 'Morning';
    }
    if (period === 'afternoon') {
      return 'Afternoon';
    }
    return 'Night';
  }

  decrementPrescriptionDoseQuantity(dose: PrescriptionModalDoseItem): void {
    if (dose.taken) {
      return;
    }

    const current = Math.max(0, Number(dose.quantity) || 0);
    dose.quantity = Math.max(0, current - 1);
  }

  incrementPrescriptionDoseQuantity(dose: PrescriptionModalDoseItem): void {
    if (dose.taken) {
      return;
    }

    const current = Math.max(0, Number(dose.quantity) || 0);
    dose.quantity = current + 1;
  }

  private toIsoFromDateAndPeriod(
    dateValue: string,
    period: DoseTimePeriod,
  ): string | null {
    if (!dateValue) {
      return null;
    }

    const [yearText, monthText, dayText] = dateValue.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      return null;
    }

    const hour = period === 'morning' ? 8 : period === 'afternoon' ? 13 : 19;
    const composed = new Date(year, month - 1, day, hour, 0, 0, 0);
    if (!Number.isFinite(composed.getTime())) {
      return null;
    }

    return composed.toISOString();
  }

  private enrichDoseMedicineNames(
    dosages: DosageItemResponse[],
    onDone: () => void,
  ): void {
    const missingMedicineIds = Array.from(
      new Set(
        dosages
          .filter(
            (item) =>
              !(item.medicineName || '').trim() &&
              !!item.medicineId &&
              !this.medicineNameById[item.medicineId],
          )
          .map((item) => item.medicineId),
      ),
    );

    if (missingMedicineIds.length === 0) {
      onDone();
      return;
    }

    this.dmrService
      .getMedicines()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (medicines: MedicineItemResponse[]) => {
          medicines.forEach((medicine) => {
            if (medicine.id) {
              this.medicineNameById[medicine.id] = medicine.name;
            }
          });
          onDone();
        },
        error: () => onDone(),
      });
  }

  private parseDate(value: string): Date | null {
    const parsed = new Date(value || '');
    if (!Number.isFinite(parsed.getTime())) {
      return null;
    }
    return parsed;
  }

  private toDateInputValue(date: Date | null): string {
    if (!date) {
      return '';
    }
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
  }

  private normalizeFreeText(value: string, maxLength: number): string {
    const normalized = (value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '';
    }
    return normalized.slice(0, maxLength);
  }

  get timelineEditNotesError(): string {
    const normalized = this.normalizeFreeText(
      this.editForm.notes,
      this.timelineNotesMaxLength,
    );
    if (!normalized) {
      return '';
    }
    if (normalized.length < this.notesMinLength) {
      return `Notes must contain at least ${this.notesMinLength} characters when provided.`;
    }
    return '';
  }

  markTimelineEditTitleTouched(): void {
    this.timelineEditTitleTouched = true;
  }

  markTimelineEditDateTouched(): void {
    this.timelineEditDateTouched = true;
  }

  markTimelineEditNotesTouched(): void {
    this.timelineEditNotesTouched = true;
  }

  get timelineEditTitleError(): string {
    if (this.activeEditEvent?.rawType !== 'lab_request') {
      return '';
    }

    const testType = this.normalizeFreeText(
      this.editForm.title,
      this.timelineTitleMaxLength,
    );
    return testType ? '' : 'Service type is required.';
  }

  get timelineEditDateError(): string {
    if (this.activeEditEvent?.rawType !== 'consultation') {
      return '';
    }

    if (!this.editForm.date) {
      return 'Consultation date and time is required.';
    }

    const parsed = new Date(this.editForm.date);
    return Number.isFinite(parsed.getTime())
      ? ''
      : 'Please enter a valid consultation date and time.';
  }

  get prescriptionModalNotesError(): string {
    const normalized = this.normalizeFreeText(
      this.prescriptionModalNotes,
      this.prescriptionNotesMaxLength,
    );
    if (!normalized) {
      return '';
    }
    if (normalized.length < this.notesMinLength) {
      return `Notes must contain at least ${this.notesMinLength} characters when provided.`;
    }
    return '';
  }

  markPrescriptionModalNotesTouched(): void {
    this.prescriptionModalNotesTouched = true;
  }

  getPrescriptionDoseNotesError(dose: PrescriptionModalDoseItem): string {
    const normalized = this.normalizeFreeText(
      dose.notes,
      this.doseNotesMaxLength,
    );
    if (!normalized) {
      return '';
    }
    if (normalized.length < this.notesMinLength) {
      return `Dose notes must contain at least ${this.notesMinLength} characters when provided.`;
    }
    return '';
  }

  markPrescriptionDoseNotesTouched(doseId: string): void {
    this.prescriptionDoseNotesTouched.add(doseId);
  }

  isPrescriptionDoseNotesTouched(doseId: string): boolean {
    return this.prescriptionDoseNotesTouched.has(doseId);
  }

  getPrescriptionDoseDateError(dose: PrescriptionModalDoseItem): string {
    const isoTime = this.toIsoFromDateAndPeriod(dose.date, dose.period);
    return isoTime ? '' : 'Please enter a valid dose date.';
  }

  markPrescriptionDoseDateTouched(doseId: string): void {
    this.prescriptionDoseDateTouched.add(doseId);
  }

  isPrescriptionDoseDateTouched(doseId: string): boolean {
    return this.prescriptionDoseDateTouched.has(doseId);
  }

  get canSaveTimelineEdit(): boolean {
    const event = this.activeEditEvent;
    if (!event || !event.canEdit || !event.id || !this.loggedInDoctorId) {
      return false;
    }

    return (
      !this.timelineEditTitleError &&
      !this.timelineEditDateError &&
      !this.timelineEditNotesError
    );
  }

  get canSavePrescriptionModal(): boolean {
    const target = this.activePrescriptionEvent;
    if (!target || !target.canEdit || !target.id || !this.loggedInDoctorId) {
      return false;
    }

    if (this.prescriptionModalNotesError) {
      return false;
    }

    return this.prescriptionModalDoses.every((dose) => {
      return (
        !this.getPrescriptionDoseDateError(dose) &&
        !this.getPrescriptionDoseNotesError(dose)
      );
    });
  }

  private getDosePeriodFromDate(date: Date | null): DoseTimePeriod {
    if (!date) {
      return 'morning';
    }

    const hour = date.getHours();
    if (hour < 12) {
      return 'morning';
    }
    if (hour < 18) {
      return 'afternoon';
    }
    return 'night';
  }

  private toDatetimeLocal(value: string): string {
    const date = new Date(value || '');
    if (!Number.isFinite(date.getTime())) {
      return '';
    }
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
  }

  private toLocalApiDateTime(value: string): string | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
      return null;
    }

    const [datePart, timePart] = value.split('T');
    if (!datePart || !timePart) {
      return null;
    }

    const normalizedTime = timePart.length === 5 ? `${timePart}:00` : timePart;
    return `${datePart}T${normalizedTime}`;
  }

  private onTimelineEditSaved(): void {
    this.savingTimelineEdit = false;
    this.timelineError = '';
    this.timelineEditTitleTouched = false;
    this.timelineEditDateTouched = false;
    this.timelineEditNotesTouched = false;
    this.showTimelineEditModal = false;
    this.activeEditEvent = null;
    this.updateModalScrollLock();
    this.loadCaseTimeline(this.caseId);
  }

  private onTimelineEditFailed(message: string): void {
    this.timelineError = message;
    this.savingTimelineEdit = false;
  }

  private getTimelineDeleteErrorMessage(type: string): string {
    if (type === 'consultation') {
      return 'Could not delete consultation.';
    }
    if (type === 'lab_request') {
      return 'Could not delete lab request.';
    }
    if (type === 'treatment') {
      return 'Could not delete prescription.';
    }
    return 'Could not delete timeline activity.';
  }

  private loadAlerts(): void {
    // Placeholder for alert loading logic
    // This will be populated when backend supports alerts
    this.alerts = [];
  }

  getAlertIcon(alertType: string): string {
    switch (alertType) {
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '📌';
    }
  }

  hasTimelineFile(event: OverviewTimelineItem): boolean {
    return !!(event?.fileUrl || '').trim();
  }

  hasScanSelection(event: OverviewTimelineItem): boolean {
    return !!event?.scanSelection;
  }

  openScanSelectionViewer(event: OverviewTimelineItem): void {
    if (!event.scanSelection) {
      return;
    }

    this.scanSelectionModalEvent = event;
    this.showScanSelectionModal = true;
    this.timelineError = '';
    this.updateModalScrollLock();
  }

  closeScanSelectionViewer(): void {
    this.showScanSelectionModal = false;
    this.scanSelectionModalEvent = null;
    this.updateModalScrollLock();
  }

  onScanSelectionModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeScanSelectionViewer();
    }
  }

  openTimelineFile(event: OverviewTimelineItem): void {
    const fileUrl = (event?.fileUrl || '').trim();
    if (!fileUrl) {
      this.timelineError = 'No file is available for this lab result.';
      return;
    }

    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }

  ngOnDestroy(): void {
    this.setBodyScrollLock(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateModalScrollLock(): void {
    this.setBodyScrollLock(
      this.showPrescriptionModal ||
        this.showDeleteConfirmModal ||
        this.showTimelineEditModal ||
        this.showScanSelectionModal,
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
