import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PatientUserResponse {
  id: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  verified: boolean;
  profilePictureUrl?: string;
  setupCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  allergies?: string;
  chronicDiseases?: string;
  height?: number;
  weight?: number;
}

export interface UserLookupResponse {
  id: string;
  email: string;
  role?: string;
  profilePictureUrl?: string;
  firstName?: string;
  lastName?: string;
  labName?: string;
  name?: string;
  companyName?: string;
  specialization?: string;
  specialty?: string;
  speciality?: string;
  department?: string;
}

export interface DoctorDirectoryResponse {
  id: string;
  email: string;
  phoneNumber?: string;
  role?: string;
  profilePictureUrl?: string;
  firstName?: string;
  lastName?: string;
  specialization?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  clinicAddress?: string;
  biography?: string;
  availabilitySchedule?: string;
}

export interface LaboratoryDirectoryResponse {
  id: string;
  email: string;
  phoneNumber?: string;
  role?: string;
  profilePictureUrl?: string;
  labName?: string;
  registrationNumber?: string;
  address?: string;
  accreditation?: string;
  openingHours?: string;
  supportedTests?: string;
}

export interface DosageResponse {
  id: string;
  medicineId: string;
  medicineName: string;
  medicineDescription?: string;
  quantity: string;
  doseNotes?: string;
  time: string;
  taken: boolean;
}

export interface PrescriptionWithDosages {
  id: string;
  prescriptionDate: string;
  doctorId: string;
  notes?: string;
  dosages: DosageResponse[];
}

export interface MedicineIntake {
  id: string;
  dosageId: string;
  medicineId: string;
  medicineName: string;
  intakeDate: string;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly userBaseUrl = '/user-api/api/v1/users';
  private readonly dmrBaseUrl = '/dmr-api/api/v1/dmr';

  constructor(private http: HttpClient) {}

  getPatientProfile(patientId: string): Observable<PatientUserResponse> {
    return this.http.get<PatientUserResponse>(
      `${this.userBaseUrl}/${patientId}`,
    );
  }

  getUserById(userId: string): Observable<UserLookupResponse> {
    return this.http.get<UserLookupResponse>(`${this.userBaseUrl}/${userId}`);
  }

  getDoctorsDirectory(): Observable<DoctorDirectoryResponse[]> {
    return this.http.get<DoctorDirectoryResponse[]>(
      `${this.userBaseUrl}/doctors`,
    );
  }

  getDoctorById(doctorId: string): Observable<DoctorDirectoryResponse> {
    return this.http.get<DoctorDirectoryResponse>(
      `${this.userBaseUrl}/doctors/${doctorId}`,
    );
  }

  getLaboratories(): Observable<LaboratoryDirectoryResponse[]> {
    return this.http.get<LaboratoryDirectoryResponse[]>(
      `${this.userBaseUrl}/laboratories`,
    );
  }

  getPatientPrescriptions(
    patientId: string,
  ): Observable<PrescriptionWithDosages[]> {
    // Get all medical cases for the patient, then get prescriptions and dosages for each
    // For now, return an empty array - the backend will need to implement this
    return this.http.get<PrescriptionWithDosages[]>(
      `${this.dmrBaseUrl}/patients/${patientId}/prescriptions`,
    );
  }

  getPatientMedicineIntake(
    patientId: string,
    startDate?: string,
    endDate?: string,
  ): Observable<MedicineIntake[]> {
    let url = `${this.dmrBaseUrl}/patients/${patientId}/medicine-intake`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    return this.http.get<MedicineIntake[]>(url);
  }

  markMedicineIntake(
    patientId: string,
    dosageId: string,
    isCompleted: boolean,
  ): Observable<MedicineIntake> {
    return this.http.patch<MedicineIntake>(
      `${this.dmrBaseUrl}/dosages/${dosageId}/taken`,
      { taken: isCompleted },
    );
  }

  recordMedicineIntake(
    patientId: string,
    dosageId: string,
    intakeDate: string,
  ): Observable<MedicineIntake> {
    return this.http.post<MedicineIntake>(
      `${this.dmrBaseUrl}/patients/${patientId}/medicine-intake`,
      { dosageId, intakeDate },
    );
  }
}
