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
  CreatePrescriptionRequest,
  DmrService,
  MedicalCaseResponse,
  MedicineItemResponse,
} from '../../../../core/services/dmr.service';
import {
  PrescriptionWithDosages,
  UserService,
} from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MedicineItem } from '../medicine-card/medicine-card.component';
import { PatientCacheService } from '../../services/patient-cache.service';

type DosePeriod = 'morning' | 'noon' | 'night';

interface PrescriptionMedicine {
  id?: string;
  name: string;
  morning: number;
  noon: number;
  night: number;
  duration: number;
  doseNotes: string;
  collapsed: boolean;
  medicineId?: string;
}

interface PersistedPrescription extends MedicineItem {
  prescriptionId: string;
  doctorId: string;
}

interface PrescriptionDraft {
  medicines: PrescriptionMedicine[];
  prescriptionNotes: string;
}

@Component({
  selector: 'app-prescription-tab',
  templateUrl: './prescription-tab.component.html',
  styleUrl: './prescription-tab.component.css',
})
export class PrescriptionTabComponent implements OnInit, OnChanges, OnDestroy {
  @Input() patientId: string | null = null;
  @Input() caseId: string | null = null;

  loggedInDoctorId = '';

  medicineName = '';
  medicineSuggestions: MedicineItemResponse[] = [];
  showMedicineSuggestions = false;
  highlightedIndex = -1;
  private focusedMedicine: PrescriptionMedicine | null = null;
  prescriptionNotesTouched = false;
  private medicineNameTouched = new WeakSet<PrescriptionMedicine>();
  private medicineDoseNotesTouched = new WeakSet<PrescriptionMedicine>();
  private medicineDosePlanTouched = new WeakSet<PrescriptionMedicine>();

  // Multi-medicine support
  medicines: PrescriptionMedicine[] = [];
  prescriptionNotes = '';

  prescriptions: PersistedPrescription[] = [];
  loading = false;
  submitting = false;
  errorMessage = '';

  private doctorId = '';
  medicalCaseId: string | null = null;
  private medicinesCatalog: MedicineItemResponse[] = [];
  private readonly draftStoragePrefix = 'medflow.prescriptionDraft';
  private readonly notesMinLength = 3;
  private readonly medicineNameMaxLength = 120;
  private readonly doseNotesMaxLength = 280;
  private readonly prescriptionNotesMaxLength = 1000;
  private destroy$ = new Subject<void>();

  constructor(
    private dmrService: DmrService,
    private userService: UserService,
    private authService: AuthService,
    private patientCacheService: PatientCacheService,
  ) {}

  ngOnInit(): void {
    // Get the currently logged-in doctor's ID
    this.loggedInDoctorId = this.authService.getUserIdAsString() || '';
    this.doctorId = this.loggedInDoctorId;
    this.medicalCaseId = this.caseId;

    this.loadMedicines();

    this.patientCacheService.workspace$
      .pipe(takeUntil(this.destroy$))
      .subscribe((workspaceData) => {
        if (!workspaceData) {
          return;
        }

        this.medicalCaseId = this.resolveMedicalCaseId(
          workspaceData.medicalCases || [],
        );
        this.prescriptions = this.mapPrescriptionData(
          workspaceData.prescriptions || [],
        );
        this.loading = false;
      });

    if (this.patientId) {
      this.patientCacheService
        .selectPatient(this.patientId)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }

    if (!this.restoreDraft()) {
      this.ensureAtLeastOneMedicineLine();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientId'] && !changes['patientId'].firstChange) {
      this.patientCacheService
        .selectPatient(this.patientId!)
        .pipe(takeUntil(this.destroy$))
        .subscribe();

      if (!this.restoreDraft()) {
        this.medicines = [];
        this.prescriptionNotes = '';
        this.ensureAtLeastOneMedicineLine();
      }
    }

    if (changes['caseId'] && !changes['caseId'].firstChange) {
      this.medicalCaseId = this.caseId;
      this.persistDraft(changes['caseId'].previousValue || null);

      if (!this.restoreDraft()) {
        this.medicines = [];
        this.prescriptionNotes = '';
        this.ensureAtLeastOneMedicineLine();
      }

      if (!this.medicalCaseId && this.patientId) {
        this.reloadFromBackend();
      }
    }
  }

  addPrescription(): void {
    if (!this.canSubmitPrescription) {
      this.errorMessage = 'Please fix the highlighted prescription fields.';
      return;
    }

    const targetCaseId = this.caseId || this.medicalCaseId;
    if (!targetCaseId || !this.loggedInDoctorId) {
      return;
    }

    this.medicalCaseId = targetCaseId;

    if (this.medicines.length === 0) {
      this.errorMessage = 'Add at least one medicine to the prescription.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    // Build dosage plans for all medicines
    const dosePlans: any[] = [];
    this.prescriptionNotes = this.normalizeFreeText(
      this.prescriptionNotes,
      this.prescriptionNotesMaxLength,
    );

    for (const med of this.medicines) {
      const cleanedName = this.normalizeFreeText(
        med.name,
        this.medicineNameMaxLength,
      );
      const cleanedDoseNotes = this.normalizeFreeText(
        med.doseNotes,
        this.doseNotesMaxLength,
      );
      const resolvedMedicineId = this.resolveMedicineIdByName(cleanedName);

      med.name = cleanedName;
      med.doseNotes = cleanedDoseNotes;

      if (!cleanedName) {
        this.errorMessage = 'Each medicine line must have a medicine name.';
        this.submitting = false;
        return;
      }

      if (!resolvedMedicineId) {
        this.errorMessage = 'Please enter a valid medicine name.';
        this.submitting = false;
        return;
      }

      if (cleanedDoseNotes && cleanedDoseNotes.length < this.notesMinLength) {
        this.errorMessage = `Dose notes for ${cleanedName} must contain at least ${this.notesMinLength} characters.`;
        this.submitting = false;
        return;
      }

      if (med.morning + med.noon + med.night <= 0) {
        this.errorMessage = `Set at least one dose for ${cleanedName}.`;
        this.submitting = false;
        return;
      }

      med.medicineId = resolvedMedicineId;
      dosePlans.push({
        medicineId: resolvedMedicineId,
        morning: Number(med.morning) || 0,
        afternoon: Number(med.noon) || 0,
        night: Number(med.night) || 0,
        days: Number(med.duration) || 1,
        doseNotes: cleanedDoseNotes || undefined,
      });
    }

    this.submitComposedPrescription(dosePlans);
  }

  addMedicine(): void {
    this.medicines.push(this.createEmptyMedicine());
    this.persistDraft();
  }

  toggleMedicineCollapse(medicine: PrescriptionMedicine): void {
    medicine.collapsed = !medicine.collapsed;
    this.persistDraft();
  }

  removeMedicine(index: number): void {
    if (this.medicines.length <= 1) {
      this.medicines[index] = this.createEmptyMedicine();
      this.persistDraft();
      return;
    }

    this.medicines.splice(index, 1);
    this.ensureAtLeastOneMedicineLine();
    this.persistDraft();
  }

  incrementDose(medicine: PrescriptionMedicine, period: DosePeriod): void {
    this.medicineDosePlanTouched.add(medicine);
    medicine[period] = Math.max(0, Number(medicine[period] || 0)) + 1;
    this.persistDraft();
  }

  decrementDose(medicine: PrescriptionMedicine, period: DosePeriod): void {
    this.medicineDosePlanTouched.add(medicine);
    medicine[period] = Math.max(0, Number(medicine[period] || 0) - 1);
    this.persistDraft();
  }

  incrementDuration(medicine: PrescriptionMedicine): void {
    medicine.duration = Math.max(1, Number(medicine.duration || 1)) + 1;
    this.persistDraft();
  }

  decrementDuration(medicine: PrescriptionMedicine): void {
    medicine.duration = Math.max(1, Number(medicine.duration || 1) - 1);
    this.persistDraft();
  }

  getMedicineSummary(medicine: PrescriptionMedicine): string {
    const days = Math.max(1, Number(medicine.duration) || 1);
    const parts: string[] = [];

    const morning = Math.max(0, Number(medicine.morning) || 0);
    const noon = Math.max(0, Number(medicine.noon) || 0);
    const night = Math.max(0, Number(medicine.night) || 0);

    if (morning > 0) {
      parts.push(`${morning} in the morning`);
    }
    if (noon > 0) {
      parts.push(`${noon} in the afternoon`);
    }
    if (night > 0) {
      parts.push(`${night} at night`);
    }

    if (parts.length === 0) {
      parts.push('No daily doses');
    }

    return `${parts.join(', ')} for ${days} day${days !== 1 ? 's' : ''}`;
  }

  deletePrescription(id: string): void {
    const selected = this.prescriptions.find((item) => item.id === id);
    if (!selected) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    this.dmrService
      .deletePrescription(
        selected.prescriptionId,
        this.doctorId || selected.doctorId,
      )
      .subscribe({
        next: () => {
          this.submitting = false;
          this.reloadPrescriptions();
        },
        error: () => {
          this.errorMessage = 'Could not delete prescription.';
          this.submitting = false;
        },
      });
  }

  onMedicineNameChange(value: string): void {
    this.medicineName = value;
    this.showMedicineSuggestions = true;
    this.updateMedicineSuggestions(value);
    this.persistDraft();
  }

  onMedicineFieldChange(value: string, medicine: PrescriptionMedicine): void {
    const normalized = this.normalizeFreeText(
      value,
      this.medicineNameMaxLength,
    );
    medicine.name = value;
    medicine.medicineId = this.resolveMedicineIdByName(normalized) || undefined;
    this.onMedicineNameChange(value);
  }

  onMedicineInputFocus(
    currentValue: string,
    medicine: PrescriptionMedicine,
  ): void {
    this.medicineName = currentValue || '';
    this.focusedMedicine = medicine;
    this.showMedicineSuggestions = true;
    this.updateMedicineSuggestions(this.medicineName);
  }

  onMedicineInputBlur(): void {
    setTimeout(() => {
      this.showMedicineSuggestions = false;
      this.focusedMedicine = null;
    }, 120);
  }

  selectMedicineSuggestion(
    item: MedicineItemResponse,
    medicine: PrescriptionMedicine,
  ): void {
    this.medicineName = item.name;
    medicine.name = item.name;
    medicine.medicineId = item.id;
    this.showMedicineSuggestions = false;
    this.medicineSuggestions = [];
    this.highlightedIndex = -1;
    this.persistDraft();
  }

  onMedicineInputKeyDown(event: KeyboardEvent): void {
    if (
      !this.showMedicineSuggestions ||
      this.medicineSuggestions.length === 0
    ) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex = Math.min(
        this.highlightedIndex + 1,
        this.medicineSuggestions.length - 1,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
      return;
    }

    if (event.key === 'Enter' && this.highlightedIndex >= 0) {
      event.preventDefault();
      if (this.focusedMedicine) {
        this.selectMedicineSuggestion(
          this.medicineSuggestions[this.highlightedIndex],
          this.focusedMedicine,
        );
      }
    }
  }

  private loadMedicines(): void {
    this.dmrService.getMedicines().subscribe({
      next: (medicines: MedicineItemResponse[]) => {
        this.medicinesCatalog = medicines;
        this.updateMedicineSuggestions(this.medicineName);
      },
      error: () => {
        this.errorMessage = 'Could not load medicines catalog.';
      },
    });
  }

  private reloadFromBackend(): void {
    if (!this.patientId) {
      this.prescriptions = [];
      this.medicalCaseId = null;
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.dmrService.getPatientMedicalCases(this.patientId).subscribe({
      next: (cases: MedicalCaseResponse[]) => {
        this.medicalCaseId = this.resolveMedicalCaseId(cases);
        this.patientCacheService.updateMedicalCases(cases || []);
        this.reloadPrescriptions();
      },
      error: () => {
        this.errorMessage = 'Could not load patient medical cases.';
        this.loading = false;
      },
    });
  }

  private reloadPrescriptions(): void {
    if (!this.patientId) {
      this.prescriptions = [];
      this.loading = false;
      return;
    }

    this.loading = true;
    this.userService.getPatientPrescriptions(this.patientId).subscribe({
      next: (items: PrescriptionWithDosages[]) => {
        this.prescriptions = this.mapPrescriptionData(items);
        this.patientCacheService.updatePrescriptions(items || []);
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load prescriptions.';
        this.loading = false;
      },
    });
  }

  private submitComposedPrescription(dosePlans: any[]): void {
    if (!this.medicalCaseId) {
      this.submitting = false;
      return;
    }

    const payload: CreatePrescriptionRequest = {
      doctorId: this.loggedInDoctorId,
      notes:
        this.normalizeFreeText(
          this.prescriptionNotes,
          this.prescriptionNotesMaxLength,
        ) || undefined,
      dosePlans,
    };

    this.dmrService.createPrescription(this.medicalCaseId, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.resetForm();
        this.reloadPrescriptions();
      },
      error: () => {
        this.errorMessage = 'Could not save prescription.';
        this.submitting = false;
      },
    });
  }

  private mapPrescriptionData(
    items: PrescriptionWithDosages[],
  ): PersistedPrescription[] {
    const cards: PersistedPrescription[] = [];

    items.forEach((prescription: PrescriptionWithDosages) => {
      const groupedByMedicine = new Map<string, PersistedPrescription>();

      (prescription.dosages || []).forEach((dose) => {
        const medicineKey = dose.medicineId || 'unknown';
        const uniqueKey = `${prescription.id}-${medicineKey}`;
        if (!groupedByMedicine.has(uniqueKey)) {
          groupedByMedicine.set(uniqueKey, {
            id: uniqueKey,
            prescriptionId: prescription.id,
            doctorId: prescription.doctorId,
            medicineId: dose.medicineId,
            medicineName: dose.medicineName || 'Medicine',
            dosage: { morning: 0, noon: 0, night: 0 },
            duration: 1,
            notes: dose.doseNotes || prescription.notes || '',
          });
        }

        const target = groupedByMedicine.get(uniqueKey)!;
        const quantity = this.parseQuantity(dose.quantity);
        const slot = this.resolveDoseSlot(dose.time);
        if (slot === 'morning') {
          target.dosage.morning += quantity;
        } else if (slot === 'noon') {
          target.dosage.noon += quantity;
        } else {
          target.dosage.night += quantity;
        }
      });

      cards.push(...Array.from(groupedByMedicine.values()));
    });

    return cards;
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

  private resolveDoseSlot(dateValue: string): 'morning' | 'noon' | 'night' {
    const hour = new Date(dateValue).getHours();
    if (hour < 12) {
      return 'morning';
    }
    if (hour < 18) {
      return 'noon';
    }
    return 'night';
  }

  private parseQuantity(quantity: string): number {
    const parsed = Number(quantity);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private normalizeFreeText(value: string, maxLength: number): string {
    const normalized = (value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '';
    }
    return normalized.slice(0, maxLength);
  }

  getMedicineNameError(medicine: PrescriptionMedicine): string {
    const cleanedName = this.normalizeFreeText(
      medicine.name,
      this.medicineNameMaxLength,
    );
    if (!cleanedName) {
      return 'Medicine name is required.';
    }

    return this.resolveMedicineIdByName(cleanedName)
      ? ''
      : 'Please enter a valid medicine name.';
  }

  isMedicineNameTouched(medicine: PrescriptionMedicine): boolean {
    return this.medicineNameTouched.has(medicine);
  }

  markMedicineNameTouched(medicine: PrescriptionMedicine): void {
    this.medicineNameTouched.add(medicine);
  }

  getDoseNotesError(medicine: PrescriptionMedicine): string {
    const cleanedNotes = this.normalizeFreeText(
      medicine.doseNotes,
      this.doseNotesMaxLength,
    );

    if (!cleanedNotes) {
      return '';
    }

    if (cleanedNotes.length < this.notesMinLength) {
      return `Dose notes must contain at least ${this.notesMinLength} characters when provided.`;
    }

    return '';
  }

  isDoseNotesTouched(medicine: PrescriptionMedicine): boolean {
    return this.medicineDoseNotesTouched.has(medicine);
  }

  markDoseNotesTouched(medicine: PrescriptionMedicine): void {
    this.medicineDoseNotesTouched.add(medicine);
  }

  getDosePlanError(medicine: PrescriptionMedicine): string {
    const totalDose =
      Number(medicine.morning || 0) +
      Number(medicine.noon || 0) +
      Number(medicine.night || 0);
    if (totalDose <= 0) {
      return 'Set at least one dose for this medicine.';
    }
    return '';
  }

  isDosePlanTouched(medicine: PrescriptionMedicine): boolean {
    return this.medicineDosePlanTouched.has(medicine);
  }

  markPrescriptionNotesTouched(): void {
    this.prescriptionNotesTouched = true;
  }

  get prescriptionNotesError(): string {
    const cleanedNotes = this.normalizeFreeText(
      this.prescriptionNotes,
      this.prescriptionNotesMaxLength,
    );

    if (!cleanedNotes) {
      return `Prescription notes are required (minimum ${this.notesMinLength} characters).`;
    }

    if (cleanedNotes.length < this.notesMinLength) {
      return `Prescription notes must contain at least ${this.notesMinLength} characters when provided.`;
    }

    return '';
  }

  get canSubmitPrescription(): boolean {
    if (
      this.submitting ||
      !this.medicalCaseId ||
      !this.loggedInDoctorId ||
      this.medicines.length === 0 ||
      !!this.prescriptionNotesError
    ) {
      return false;
    }

    return this.medicines.every((medicine) => {
      const hasName = !this.getMedicineNameError(medicine);
      const notesOk = !this.getDoseNotesError(medicine);
      const doseOk = !this.getDosePlanError(medicine);
      return hasName && notesOk && doseOk;
    });
  }

  private resolveMedicineIdByName(name: string): string | null {
    if (!name) {
      return null;
    }

    const matched = this.medicinesCatalog.find(
      (item) => item.name.trim().toLowerCase() === name.toLowerCase(),
    );

    return matched?.id || null;
  }

  private updateMedicineSuggestions(query: string): void {
    const normalized = (query || '').trim().toLowerCase();
    this.medicineSuggestions = normalized
      ? this.medicinesCatalog
          .filter((item) => item.name.toLowerCase().includes(normalized))
          .slice(0, 12)
      : this.medicinesCatalog.slice(0, 12);
    this.highlightedIndex = this.medicineSuggestions.length ? 0 : -1;
  }

  persistDraft(caseIdOverride?: string | null): void {
    if (typeof window === 'undefined') {
      return;
    }

    const key = this.getDraftStorageKey(caseIdOverride);
    if (!key) {
      return;
    }

    const draft: PrescriptionDraft = {
      medicines: this.medicines.map((medicine) => ({ ...medicine })),
      prescriptionNotes: this.prescriptionNotes,
    };

    window.sessionStorage.setItem(key, JSON.stringify(draft));
  }

  private restoreDraft(caseIdOverride?: string | null): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const key = this.getDraftStorageKey(caseIdOverride);
    if (!key) {
      return false;
    }

    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return false;
    }

    try {
      const draft = JSON.parse(raw) as Partial<PrescriptionDraft>;
      const draftMedicines = Array.isArray(draft.medicines)
        ? draft.medicines
        : [];

      this.medicines = draftMedicines.map((item) => ({
        ...this.createEmptyMedicine(),
        ...item,
        morning: Math.max(0, Number(item.morning) || 0),
        noon: Math.max(0, Number(item.noon) || 0),
        night: Math.max(0, Number(item.night) || 0),
        duration: Math.max(1, Number(item.duration) || 1),
        collapsed: !!item.collapsed,
      }));

      this.prescriptionNotes = (draft.prescriptionNotes || '').toString();

      if (this.medicines.length === 0) {
        this.ensureAtLeastOneMedicineLine();
      }

      return true;
    } catch {
      return false;
    }
  }

  private clearDraft(caseIdOverride?: string | null): void {
    if (typeof window === 'undefined') {
      return;
    }

    const key = this.getDraftStorageKey(caseIdOverride);
    if (!key) {
      return;
    }

    window.sessionStorage.removeItem(key);
  }

  private getDraftStorageKey(caseIdOverride?: string | null): string | null {
    const resolvedCaseId = caseIdOverride ?? this.caseId;
    if (!this.patientId || !resolvedCaseId) {
      return null;
    }
    return `${this.draftStoragePrefix}:${this.patientId}:${resolvedCaseId}`;
  }

  private createEmptyMedicine(): PrescriptionMedicine {
    return {
      name: '',
      morning: 0,
      noon: 0,
      night: 0,
      duration: 1,
      doseNotes: '',
      collapsed: false,
      medicineId: undefined,
    };
  }

  private resetForm(): void {
    this.clearDraft();
    this.medicineName = '';
    this.medicineSuggestions = [];
    this.showMedicineSuggestions = false;
    this.highlightedIndex = -1;
    this.errorMessage = '';
    this.prescriptionNotesTouched = false;
    this.medicineNameTouched = new WeakSet<PrescriptionMedicine>();
    this.medicineDoseNotesTouched = new WeakSet<PrescriptionMedicine>();
    this.medicineDosePlanTouched = new WeakSet<PrescriptionMedicine>();
    this.prescriptionNotes = '';
    this.medicines = [];
    this.ensureAtLeastOneMedicineLine();
  }

  private ensureAtLeastOneMedicineLine(): void {
    if (this.medicines.length > 0) {
      return;
    }

    this.addMedicine();
  }

  ngOnDestroy(): void {
    this.persistDraft();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
