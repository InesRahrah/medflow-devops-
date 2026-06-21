import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MedicalCaseResponse {
  id: string;
  patientId: string;
  doctorId: string;
  name: string;
  startDate: string;
  endDate?: string | null;
  createdAt: string;
  members: string[];
}

export interface MedicalCaseDetailItem {
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

export interface MedicalCaseDetailsResponse {
  medicalCaseId: string;
  caseName: string;
  details: MedicalCaseDetailItem[];
}

export interface CreateMedicalCaseRequest {
  accessCode: string;
  doctorId: string;
  name: string;
  startDate: string;
  endDate?: string;
  memberIds?: string[];
}

export interface ValidateAccessCodeRequest {
  accessCode: string;
}

export interface ValidateAccessCodeResponse {
  valid: boolean;
  patientId: string;
}

export interface JoinMedicalCaseRequest {
  accessCode: string;
  doctorId: string;
}

export interface UpdateMedicalCaseRequest {
  doctorId: string;
  name: string;
  startDate: string;
  endDate?: string;
}

export interface CreateConsultationRequest {
  doctorId: string;
  consultationDate: string;
  notes?: string;
}

export interface UpdateConsultationRequest {
  doctorId: string;
  consultationDate: string;
  notes?: string;
}

export interface CreateLabRequestRequest {
  doctorId: string;
  testType: string;
  notes?: string;
}

export interface UpdateLabRequestRequest {
  doctorId: string;
  testType: string;
  notes?: string;
}

export interface AssignLabToRequestRequest {
  patientId: string;
  laboId: string;
}

export interface LabQueueItemResponse {
  requestId: string;
  medicalCaseId: string;
  patientId: string;
  patientName: string;
  requestedByDoctorId?: string;
  requestedByName?: string;
  laboId?: string;
  laboName?: string;
  testType: string;
  notes?: string;
  status: string;
  requestedAt: string;
}

export interface CreateMedicineRequest {
  name: string;
  description?: string;
}

export interface MedicineItemResponse {
  id: string;
  name: string;
  description?: string;
}

export interface PrescriptionDosePlanRequest {
  medicineId: string;
  morning: number;
  afternoon: number;
  night: number;
  days: number;
  doseNotes?: string;
}

export interface CreatePrescriptionRequest {
  doctorId: string;
  notes?: string;
  dosePlans: PrescriptionDosePlanRequest[];
}

export interface UpdatePrescriptionRequest {
  doctorId: string;
  notes?: string;
}

export interface DosageItemResponse {
  id: string;
  prescriptionId: string;
  medicineId: string;
  medicineName?: string;
  quantity: string;
  doseNotes?: string;
  time: string;
  taken: boolean;
}

export interface UpdateDosageRequest {
  doctorId: string;
  quantity: string;
  doseNotes?: string;
  time: string;
  taken: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DmrService {
  private readonly dmrBaseUrl = '/dmr-api/api/v1/dmr';

  constructor(private http: HttpClient) {}

  createMedicalCase(
    request: CreateMedicalCaseRequest,
  ): Observable<MedicalCaseResponse> {
    return this.http.post<MedicalCaseResponse>(
      `${this.dmrBaseUrl}/medical-cases`,
      request,
    );
  }

  validateAccessCode(
    accessCode: string,
  ): Observable<ValidateAccessCodeResponse> {
    return this.http.post<ValidateAccessCodeResponse>(
      `${this.dmrBaseUrl}/access-codes/validate`,
      { accessCode },
    );
  }

  joinMedicalCase(
    medicalCaseId: string,
    request: JoinMedicalCaseRequest,
  ): Observable<MedicalCaseResponse> {
    return this.http.post<MedicalCaseResponse>(
      `${this.dmrBaseUrl}/medical-cases/${medicalCaseId}/join`,
      request,
    );
  }

  updateMedicalCase(
    medicalCaseId: string,
    request: UpdateMedicalCaseRequest,
  ): Observable<MedicalCaseResponse> {
    return this.http.put<MedicalCaseResponse>(
      `${this.dmrBaseUrl}/medical-cases/${medicalCaseId}`,
      request,
    );
  }

  deleteMedicalCase(medicalCaseId: string, doctorId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.dmrBaseUrl}/medical-cases/${medicalCaseId}?doctorId=${encodeURIComponent(doctorId)}`,
    );
  }

  getDoctorMedicalCases(doctorId: string): Observable<MedicalCaseResponse[]> {
    return this.http.get<MedicalCaseResponse[]>(
      `${this.dmrBaseUrl}/doctors/${doctorId}/medical-cases`,
    );
  }

  getPatientMedicalCases(patientId: string): Observable<MedicalCaseResponse[]> {
    return this.http.get<MedicalCaseResponse[]>(
      `${this.dmrBaseUrl}/patients/${patientId}/medical-cases`,
    );
  }

  getMedicalCaseDetails(
    medicalCaseId: string,
  ): Observable<MedicalCaseDetailsResponse> {
    return this.http.get<MedicalCaseDetailsResponse>(
      `${this.dmrBaseUrl}/medical-cases/${medicalCaseId}`,
    );
  }

  createConsultation(
    medicalCaseId: string,
    request: CreateConsultationRequest,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.dmrBaseUrl}/medical-cases/${medicalCaseId}/consultations`,
      request,
    );
  }

  updateConsultation(
    consultationId: string,
    request: UpdateConsultationRequest,
  ): Observable<{ id: string }> {
    return this.http.put<{ id: string }>(
      `${this.dmrBaseUrl}/consultations/${consultationId}`,
      request,
    );
  }

  deleteConsultation(
    consultationId: string,
    doctorId: string,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.dmrBaseUrl}/consultations/${consultationId}?doctorId=${encodeURIComponent(doctorId)}`,
    );
  }

  createLabRequest(
    medicalCaseId: string,
    request: CreateLabRequestRequest,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.dmrBaseUrl}/medical-cases/${medicalCaseId}/lab-requests`,
      request,
    );
  }

  updateLabRequest(
    labRequestId: string,
    request: UpdateLabRequestRequest,
  ): Observable<{ id: string }> {
    return this.http.put<{ id: string }>(
      `${this.dmrBaseUrl}/lab-requests/${labRequestId}`,
      request,
    );
  }

  assignLabToRequest(
    labRequestId: string,
    request: AssignLabToRequestRequest,
  ): Observable<{ id: string }> {
    return this.http.patch<{ id: string }>(
      `${this.dmrBaseUrl}/lab-requests/${labRequestId}/assign-lab`,
      request,
    );
  }

  deleteLabRequest(labRequestId: string, doctorId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.dmrBaseUrl}/lab-requests/${labRequestId}?doctorId=${encodeURIComponent(doctorId)}`,
    );
  }

  getLabReports(laboId: string): Observable<LabQueueItemResponse[]> {
    return this.http.get<LabQueueItemResponse[]>(
      `${this.dmrBaseUrl}/labs/${laboId}/lab-requests`,
    );
  }

  getPendingLabRequests(laboId: string): Observable<LabQueueItemResponse[]> {
    return this.http.get<LabQueueItemResponse[]>(
      `${this.dmrBaseUrl}/labs/${laboId}/lab-requests/pending`,
    );
  }

  getLabRequestSummary(labRequestId: string): Observable<LabQueueItemResponse> {
    return this.http.get<LabQueueItemResponse>(
      `${this.dmrBaseUrl}/lab-requests/${labRequestId}/summary`,
    );
  }

  createLabResultWithFile(
    medicalCaseId: string,
    payload: FormData,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.dmrBaseUrl}/medical-cases/${medicalCaseId}/lab-results/upload`,
      payload,
    );
  }

  createMedicine(request: CreateMedicineRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.dmrBaseUrl}/medicines`,
      request,
    );
  }

  getMedicines(): Observable<MedicineItemResponse[]> {
    return this.http.get<MedicineItemResponse[]>(
      `${this.dmrBaseUrl}/medicines`,
    );
  }

  createPrescription(
    medicalCaseId: string,
    request: CreatePrescriptionRequest,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.dmrBaseUrl}/medical-cases/${medicalCaseId}/prescriptions`,
      request,
    );
  }

  updatePrescription(
    prescriptionId: string,
    request: UpdatePrescriptionRequest,
  ): Observable<{ id: string }> {
    return this.http.put<{ id: string }>(
      `${this.dmrBaseUrl}/prescriptions/${prescriptionId}`,
      request,
    );
  }

  deletePrescription(
    prescriptionId: string,
    doctorId: string,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.dmrBaseUrl}/prescriptions/${prescriptionId}?doctorId=${encodeURIComponent(doctorId)}`,
    );
  }

  getPrescriptionDosages(
    prescriptionId: string,
  ): Observable<DosageItemResponse[]> {
    return this.http.get<DosageItemResponse[]>(
      `${this.dmrBaseUrl}/prescriptions/${prescriptionId}/dosages`,
    );
  }

  updateDosage(
    dosageId: string,
    request: UpdateDosageRequest,
  ): Observable<DosageItemResponse> {
    return this.http.put<DosageItemResponse>(
      `${this.dmrBaseUrl}/dosages/${dosageId}`,
      request,
    );
  }

  deleteDosage(dosageId: string, doctorId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.dmrBaseUrl}/dosages/${dosageId}?doctorId=${encodeURIComponent(doctorId)}`,
    );
  }
}
