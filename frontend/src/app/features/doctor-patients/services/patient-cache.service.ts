import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import {
  PatientUserResponse,
  PrescriptionWithDosages,
  UserService,
} from '../../../core/services/user.service';
import {
  DmrService,
  MedicalCaseDetailsResponse,
  MedicalCaseResponse,
} from '../../../core/services/dmr.service';

export interface PatientWorkspaceData {
  patient: PatientUserResponse;
  medicalCases: MedicalCaseResponse[];
  prescriptions: PrescriptionWithDosages[];
  latestMedicalCaseId: string | null;
  consultations: Array<{ id?: string; date: string; notes: string }>;
  labRequests: Array<{ id?: string; type: string; date: string; notes: string }>;
  caseDetails?: MedicalCaseDetailsResponse;
}

@Injectable({
  providedIn: 'root',
})
export class PatientCacheService {
  private readonly workspaceState$ = new BehaviorSubject<PatientWorkspaceData | null>(null);
  private readonly patientState$ = new BehaviorSubject<PatientUserResponse | null>(null);
  private currentPatientId: string | null = null;

  readonly patient$ = this.patientState$.asObservable();
  readonly workspace$ = this.workspaceState$.asObservable();

  constructor(private userService: UserService, private dmrService: DmrService) {}

  selectPatient(patientId: string): Observable<PatientWorkspaceData> {
    if (this.currentPatientId === patientId && this.workspaceState$.value) {
      return this.workspace$.pipe(
        map((data) => data || this.createEmptyWorkspace({} as PatientUserResponse)),
      );
    }

    this.currentPatientId = patientId;

    return forkJoin({
      patient: this.userService.getPatientProfile(patientId),
      medicalCases: this.dmrService.getPatientMedicalCases(patientId),
      prescriptions: this.userService.getPatientPrescriptions(patientId),
    }).pipe(
      switchMap(({ patient, medicalCases, prescriptions }) => {
        const latestMedicalCaseId = this.findLatestMedicalCaseId(medicalCases || []);

        if (!latestMedicalCaseId) {
          const workspaceData = this.createEmptyWorkspace(patient, medicalCases || [], prescriptions || []);
          this.setWorkspaceData(workspaceData);
          return of(workspaceData);
        }

        return this.dmrService.getMedicalCaseDetails(latestMedicalCaseId).pipe(
          map((caseDetails) => {
            const { consultations, labRequests } = this.extractCaseLists(caseDetails);
            const workspaceData: PatientWorkspaceData = {
              patient,
              medicalCases: medicalCases || [],
              prescriptions: prescriptions || [],
              latestMedicalCaseId,
              consultations,
              labRequests,
              caseDetails,
            };
            this.setWorkspaceData(workspaceData);
            return workspaceData;
          }),
          catchError(() => {
            const workspaceData = this.createEmptyWorkspace(
              patient,
              medicalCases || [],
              prescriptions || [],
              latestMedicalCaseId,
            );
            this.setWorkspaceData(workspaceData);
            return of(workspaceData);
          }),
        );
      }),
      shareReplay(1),
    );
  }

  getCachedPatient(): Observable<PatientWorkspaceData | null> {
    return this.workspace$;
  }

  updatePatient(patient: PatientUserResponse): void {
    const current = this.workspaceState$.value;
    if (!current) {
      return;
    }

    this.setWorkspaceData({
      ...current,
      patient,
    });
  }

  updateMedicalCases(medicalCases: MedicalCaseResponse[]): void {
    const current = this.workspaceState$.value;
    if (!current) {
      return;
    }

    const latestMedicalCaseId = this.findLatestMedicalCaseId(medicalCases || []);
    this.setWorkspaceData({
      ...current,
      medicalCases: medicalCases || [],
      latestMedicalCaseId,
    });
  }

  updatePrescriptions(prescriptions: PrescriptionWithDosages[]): void {
    const current = this.workspaceState$.value;
    if (!current) {
      return;
    }

    this.setWorkspaceData({
      ...current,
      prescriptions: prescriptions || [],
    });
  }

  updateConsultations(consultations: Array<{ id?: string; date: string; notes: string }>): void {
    const current = this.workspaceState$.value;
    if (!current) {
      return;
    }

    this.setWorkspaceData({
      ...current,
      consultations: consultations || [],
    });
  }

  updateCaseDetails(caseDetails: MedicalCaseDetailsResponse): void {
    const current = this.workspaceState$.value;
    if (!current) {
      return;
    }

    const { consultations, labRequests } = this.extractCaseLists(caseDetails);
    this.setWorkspaceData({
      ...current,
      caseDetails,
      consultations,
      labRequests,
    });
  }

  invalidateCache(): void {
    this.workspaceState$.next(null);
    this.patientState$.next(null);
    this.currentPatientId = null;
  }

  private setWorkspaceData(data: PatientWorkspaceData): void {
    this.workspaceState$.next(data);
    this.patientState$.next(data.patient);
  }

  private extractCaseLists(caseDetails: MedicalCaseDetailsResponse): {
    consultations: Array<{ id?: string; date: string; notes: string }>;
    labRequests: Array<{ id?: string; type: string; date: string; notes: string }>;
  } {
    const entries = caseDetails?.details || [];

    const consultations = entries
      .filter((item) => item.type === 'consultation')
      .map((item) => ({
        id: item.id,
        date: item.date || '',
        notes: item.additionalInfo || item.name || 'Consultation',
      }))
      .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());

    const labRequests = entries
      .filter((item) => item.type === 'lab_request')
      .map((item) => ({
        id: item.id,
        type: item.name || 'Lab request',
        date: item.date || '',
        notes: item.additionalInfo || '',
      }))
      .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());

    return { consultations, labRequests };
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

  private createEmptyWorkspace(
    patient: PatientUserResponse,
    medicalCases: MedicalCaseResponse[] = [],
    prescriptions: PrescriptionWithDosages[] = [],
    latestMedicalCaseId: string | null = null,
  ): PatientWorkspaceData {
    return {
      patient,
      medicalCases,
      prescriptions,
      latestMedicalCaseId,
      consultations: [],
      labRequests: [],
    };
  }
}
