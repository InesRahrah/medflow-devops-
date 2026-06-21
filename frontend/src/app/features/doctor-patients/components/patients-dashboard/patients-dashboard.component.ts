import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, mergeMap, map } from 'rxjs/operators';
import { UserService, PatientUserResponse } from '../../../../core/services/user.service';
import { DmrService, MedicalCaseResponse } from '../../../../core/services/dmr.service';
import { AuthService } from '../../../../core/services/auth.service';

interface PatientListItem {
  patientId: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  latestCaseName: string;
  lastCaseDate: string;
  totalCases: number;
  caseStatus: 'active' | 'urgent' | 'waiting' | 'follow-up';
}

type PatientCaseStatus = PatientListItem['caseStatus'];

@Component({
  selector: 'app-patients-dashboard',
  templateUrl: './patients-dashboard.component.html',
  styleUrl: './patients-dashboard.component.css',
})
export class PatientsDashboardComponent implements OnInit, OnDestroy {
  patients: PatientListItem[] = [];
  filteredPatients: PatientListItem[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  searchQuery = '';
  selectedStatus = 'all'; // 'all', 'active', 'urgent', 'waiting', 'follow-up'
  readonly statusFilterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Urgent', value: 'urgent' },
    { label: 'Waiting Results', value: 'waiting' },
    { label: 'Follow-up', value: 'follow-up' },
  ];

  showAddPatientModal = false;
  addPatientStep: 'code' | 'action' = 'code';
  addPatientAction: 'create' | 'join' = 'create';
  addPatientCode = '';
  addPatientCaseName = '';
  addPatientValidatedPatientId = '';
  addPatientExistingCases: MedicalCaseResponse[] = [];
  addPatientJoinCaseId = '';
  addPatientCasesLoading = false;
  addPatientSubmitting = false;
  addPatientModalError = '';

  // Dropdown options for existing cases
  get addPatientExistingCasesOptions() {
    return this.addPatientExistingCases.map((caseItem) => ({
      label: `${caseItem.name} — ${new Date(caseItem.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })}`,
      value: caseItem.id,
    }));
  }

  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();
  private doctorId = '';

  constructor(
    private dmrService: DmrService,
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeDashboard();
  }

  private initializeDashboard(): void {
    this.doctorId = this.authService.getUserIdAsString() || 'unknown';
    this.loadPatients();

    // Setup search debounce
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((query: any) => {
        this.searchQuery = query;
        this.applyFilters();
      });
  }

  private loadPatients(): void {
    this.loading = true;
    this.errorMessage = '';

    this.dmrService
      .getDoctorMedicalCases(this.doctorId)
      .pipe(
        mergeMap((cases: MedicalCaseResponse[]) => {
          if (cases.length === 0) {
            return of({ cases, patientProfiles: [] });
          }
          // Get unique patient IDs
          const uniquePatientIds = [...new Set(cases.map((c: any) => c.patientId))];
          // Fetch patient profiles for each unique patient
          const patientRequests = uniquePatientIds.map((patientId: any) =>
            this.userService.getPatientProfile(patientId)
          );
          // Combine all patient profile requests
          return forkJoin(patientRequests).pipe(
            map((patientProfiles: any) => ({ cases, patientProfiles }))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data: any) => {
          this.buildPatientList(data.cases, data.patientProfiles);
          this.applyFilters();
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Failed to load patient cases:', error);
          this.errorMessage = 'Failed to load patients. Please try again.';
          this.loading = false;
        },
      });
  }

  openAddPatientModal(): void {
    if (this.addPatientSubmitting) {
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
    if (this.addPatientSubmitting) {
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

  goBackToAddPatientCodeStep(): void {
    if (this.addPatientSubmitting) {
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
    this.addPatientSubmitting = true;
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
        const message =
          error?.error?.message ||
          error?.error?.error ||
          'Invalid patient code. Please check and try again.';
        this.errorMessage = message;
        this.addPatientModalError = message;
        this.addPatientSubmitting = false;
      },
    });
  }

  private loadExistingCasesForValidatedPatient(): void {
    if (!this.addPatientValidatedPatientId) {
      this.addPatientExistingCases = [];
      this.addPatientCasesLoading = false;
      this.addPatientSubmitting = false;
      return;
    }

    this.addPatientCasesLoading = true;
    this.dmrService.getPatientMedicalCases(this.addPatientValidatedPatientId).subscribe({
      next: (cases) => {
        this.addPatientExistingCases = cases;
        this.addPatientJoinCaseId = cases[0]?.id || '';
        this.addPatientCasesLoading = false;
        this.addPatientSubmitting = false;
      },
      error: () => {
        this.addPatientExistingCases = [];
        this.addPatientJoinCaseId = '';
        this.addPatientCasesLoading = false;
        this.addPatientSubmitting = false;
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

    this.addPatientSubmitting = true;
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
        next: () => {
          this.successMessage = 'Patient added and medical case created successfully.';
          this.addPatientSubmitting = false;
          this.showAddPatientModal = false;
          this.loadPatients();
          if (this.addPatientValidatedPatientId) {
            this.router.navigate(['/doctor/patients', this.addPatientValidatedPatientId], {
              queryParams: { tab: 'overview' },
            });
          }
        },
        error: (error) => {
          const message =
            error?.error?.message ||
            error?.error?.error ||
            'Could not create case. Check details and try again.';
          this.errorMessage = message;
          this.addPatientModalError = message;
          this.addPatientSubmitting = false;
        },
      });
  }

  private joinExistingCaseFromModal(code: string): void {
    if (!this.addPatientJoinCaseId) {
      this.addPatientModalError = 'Select an existing case to join.';
      return;
    }

    this.addPatientSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.addPatientModalError = '';

    this.dmrService
      .joinMedicalCase(this.addPatientJoinCaseId, {
        accessCode: code,
        doctorId: this.doctorId,
      })
      .subscribe({
        next: () => {
          this.successMessage = 'Joined existing medical case successfully.';
          this.addPatientSubmitting = false;
          this.showAddPatientModal = false;
          this.loadPatients();
          if (this.addPatientValidatedPatientId) {
            this.router.navigate(['/doctor/patients', this.addPatientValidatedPatientId], {
              queryParams: { tab: 'overview' },
            });
          }
        },
        error: (error) => {
          const message =
            error?.error?.message ||
            error?.error?.error ||
            'Could not join selected case. Check access code and try again.';
          this.errorMessage = message;
          this.addPatientModalError = message;
          this.addPatientSubmitting = false;
        },
      });
  }

  private buildPatientList(cases: MedicalCaseResponse[], patientProfiles: PatientUserResponse[]): void {
    const patientMap = new Map<string, PatientListItem>();
    const profileMap = new Map<string, PatientUserResponse>();

    // Create a map of patient profiles for quick lookup
    patientProfiles.forEach((profile: any) => {
      profileMap.set(profile.id, profile);
    });

    cases.forEach((medicalCase: any) => {
      const patientId = medicalCase.patientId || '';
      const profile = profileMap.get(patientId) || ({} as PatientUserResponse);

      if (!patientMap.has(patientId)) {
        const caseDate = new Date(medicalCase.startDate || '');
        patientMap.set(patientId, {
          patientId: patientId,
          firstName: profile.firstName || 'Unknown',
          lastName: profile.lastName || 'Patient',
          profilePictureUrl: profile.profilePictureUrl,
          latestCaseName: medicalCase.name || 'No name',
          lastCaseDate: this.formatDate(caseDate),
          totalCases: 0,
          caseStatus: this.determineCaseStatus(medicalCase),
        });
      }

      const patient = patientMap.get(patientId)!;
      patient.totalCases++;

      // Update latest case if this one is newer
      const caseDate = new Date(medicalCase.startDate || '');
      const currentLatestDate = this.parseDate(patient.lastCaseDate);
      if (caseDate > currentLatestDate) {
        patient.latestCaseName = medicalCase.name || 'No name';
        patient.lastCaseDate = this.formatDate(caseDate);
        patient.caseStatus = this.determineCaseStatus(medicalCase);
      }
    });

    this.patients = Array.from(patientMap.values());
  }

  private determineCaseStatus(
    medicalCase: MedicalCaseResponse
  ): 'active' | 'urgent' | 'waiting' | 'follow-up' {
    const startDate = new Date(medicalCase.startDate || '');
    if (isNaN(startDate.getTime())) {
      return 'active';
    }

    const now = Date.now();
    const ageInDays = Math.floor((now - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Temporary UI-focused heuristic until backend provides an explicit case status.
    if (ageInDays > 21) {
      return 'urgent';
    }
    if (ageInDays > 10) {
      return 'waiting';
    }
    if (ageInDays > 3) {
      return 'follow-up';
    }
    return 'active';
  }

  onSearchChange(query: string): void {
    this.searchSubject$.next(query);
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatus = status;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredPatients = this.patients.filter((patient) => {
      const matchesSearch =
        !this.searchQuery ||
        `${patient.firstName} ${patient.lastName}`
          .toLowerCase()
          .includes(this.searchQuery.toLowerCase());

      const matchesStatus =
        this.selectedStatus === 'all' || patient.caseStatus === this.selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }

  selectPatient(patient: PatientListItem): void {
    this.router.navigate(['/doctor/patients', patient.patientId], {
      queryParams: { tab: 'overview' },
    });
  }

  private formatDate(date: Date): string {
    if (!date || isNaN(date.getTime())) return 'Unknown';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }

  private parseDate(dateStr: string): Date {
    if (dateStr === 'Today') {
      return new Date();
    }
    if (dateStr === 'Yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    }
    return new Date(dateStr) || new Date(0);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return '#22c55e'; // Green
      case 'urgent':
        return '#ef4444'; // Red
      case 'waiting':
        return '#f59e0b'; // Amber
      case 'follow-up':
        return '#3b82f6'; // Blue
      default:
        return '#6b7280'; // Gray
    }
  }

  getPatientInitials(patient: PatientListItem): string {
    const first = (patient.firstName || '').trim().charAt(0);
    const last = (patient.lastName || '').trim().charAt(0);
    const initials = `${first}${last}`.toUpperCase();
    return initials || 'PT';
  }

  getStatusLabel(status: PatientCaseStatus): string {
    switch (status) {
      case 'follow-up':
        return 'Follow-up';
      case 'waiting':
        return 'Waiting';
      case 'urgent':
        return 'Urgent';
      case 'active':
      default:
        return 'Active';
    }
  }

  getPriorityClass(status: PatientCaseStatus): 'urgent' | 'warning' | '' {
    if (status === 'urgent') {
      return 'urgent';
    }
    if (status === 'waiting' || status === 'follow-up') {
      return 'warning';
    }
    return '';
  }

  getStatusCount(status: PatientCaseStatus): number {
    return this.patients.filter((patient) => patient.caseStatus === status).length;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
