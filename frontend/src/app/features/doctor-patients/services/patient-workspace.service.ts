import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateConsultationRequest,
  CreateLabRequestRequest,
  CreatePrescriptionRequest,
  DmrService,
  MedicalCaseDetailsResponse,
  MedicalCaseResponse,
} from '../../../core/services/dmr.service';
import {
  DoctorDirectoryResponse,
  PrescriptionWithDosages,
  UserService,
} from '../../../core/services/user.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PatientWorkspaceService {
  constructor(
    private dmrService: DmrService,
    private userService: UserService,
  ) {}

  getPatientMedicalCases(patientId: string): Observable<MedicalCaseResponse[]> {
    return this.dmrService.getPatientMedicalCases(patientId);
  }

  getLatestPatientMedicalCase(patientId: string): Observable<MedicalCaseResponse | null> {
    return this.getPatientMedicalCases(patientId).pipe(
      map((cases) => {
        if (!cases.length) {
          return null;
        }
        const sorted = [...cases].sort(
          (a, b) =>
            new Date(b.createdAt || b.startDate || '').getTime() -
            new Date(a.createdAt || a.startDate || '').getTime(),
        );
        return sorted[0] || null;
      }),
    );
  }

  getMedicalCaseDetails(caseId: string): Observable<MedicalCaseDetailsResponse> {
    return this.dmrService.getMedicalCaseDetails(caseId);
  }

  addConsultation(
    caseId: string,
    consultation: CreateConsultationRequest,
  ): Observable<{ id: string }> {
    return this.dmrService.createConsultation(caseId, consultation);
  }

  addLabRequest(
    caseId: string,
    labRequest: CreateLabRequestRequest,
  ): Observable<{ id: string }> {
    return this.dmrService.createLabRequest(caseId, labRequest);
  }

  addPrescription(
    caseId: string,
    prescription: CreatePrescriptionRequest,
  ): Observable<{ id: string }> {
    return this.dmrService.createPrescription(caseId, prescription);
  }

  getPatientPrescriptions(patientId: string): Observable<PrescriptionWithDosages[]> {
    return this.userService.getPatientPrescriptions(patientId);
  }

  getDoctorsDirectory(): Observable<DoctorDirectoryResponse[]> {
    return this.userService.getDoctorsDirectory();
  }
}
