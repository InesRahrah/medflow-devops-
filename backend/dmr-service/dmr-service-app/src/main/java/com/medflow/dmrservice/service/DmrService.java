package com.medflow.dmrservice.service;

import com.medflow.dmrservice.dto.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface DmrService {
    UUID createMedicine(CreateMedicineRequest request);
    List<MedicineResponse> getMedicines();
    ValidateAccessCodeResponse validateAccessCode(ValidateAccessCodeRequest request);
    MedicalCaseResponse createMedicalCase(CreateMedicalCaseRequest request);
    MedicalCaseResponse joinMedicalCase(UUID medicalCaseId, JoinMedicalCaseRequest request);
    MedicalCaseResponse updateMedicalCase(UUID medicalCaseId, UpdateMedicalCaseRequest request);
    void deleteMedicalCase(UUID medicalCaseId, UUID doctorId);
    List<MedicalCaseResponse> getMedicalCasesByPatient(UUID patientId);
    List<MedicalCaseResponse> getMedicalCasesByDoctor(UUID doctorId);
    MedicalCaseDetailsResponse getMedicalCaseDetails(UUID medicalCaseId);
    UUID createConsultation(UUID medicalCaseId, CreateConsultationRequest request);
    UUID updateConsultation(UUID consultationId, UpdateConsultationRequest request);
    void deleteConsultation(UUID consultationId, UUID doctorId);
    UUID createLabRequest(UUID medicalCaseId, CreateLabRequestRequest request);
    UUID updateLabRequest(UUID labRequestId, UpdateLabRequestRequest request);
    UUID assignLabToRequest(UUID labRequestId, AssignLabRequestRequest request);
    void deleteLabRequest(UUID labRequestId, UUID doctorId);
    List<LabQueueItemResponse> getLabReports(UUID laboId);
    List<LabQueueItemResponse> getPendingLabRequests(UUID laboId);
    LabQueueItemResponse getLabRequestSummary(UUID labRequestId);
    UUID createLabResult(UUID medicalCaseId, CreateLabResultRequest request);
    UUID createPrescription(UUID medicalCaseId, CreatePrescriptionRequest request);
    UUID updatePrescription(UUID prescriptionId, UpdatePrescriptionRequest request);
    void deletePrescription(UUID prescriptionId, UUID doctorId);
    List<DosageResponse> getPrescriptionDosages(UUID prescriptionId);
    DosageResponse updateDosage(UUID dosageId, UpdateDosageRequest request);
    void deleteDosage(UUID dosageId, UUID doctorId);
    DosageResponse updateDosageTaken(UUID dosageId, UpdateDosageTakenRequest request);
    List<Map<String, Object>> getPatientPrescriptions(UUID patientId);
}
