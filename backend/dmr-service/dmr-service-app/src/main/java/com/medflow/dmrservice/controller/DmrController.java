package com.medflow.dmrservice.controller;

import com.medflow.dmrservice.dto.*;
import com.medflow.dmrservice.service.FileStorageService;
import com.medflow.dmrservice.service.DmrService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/dmr")
@RequiredArgsConstructor
public class DmrController {

    private final DmrService dmrService;
    private final FileStorageService fileStorageService;

    @PostMapping("/medicines")
    public ResponseEntity<Map<String, UUID>> createMedicine(@Valid @RequestBody CreateMedicineRequest request) {
        return new ResponseEntity<>(Map.of("id", dmrService.createMedicine(request)), HttpStatus.CREATED);
    }

    @GetMapping("/medicines")
    public ResponseEntity<List<MedicineResponse>> getMedicines() {
        return ResponseEntity.ok(dmrService.getMedicines());
    }

    @PostMapping("/access-codes/validate")
    public ResponseEntity<ValidateAccessCodeResponse> validateAccessCode(
            @Valid @RequestBody ValidateAccessCodeRequest request
    ) {
        return ResponseEntity.ok(dmrService.validateAccessCode(request));
    }

    @PostMapping("/medical-cases")
    public ResponseEntity<MedicalCaseResponse> createMedicalCase(@Valid @RequestBody CreateMedicalCaseRequest request) {
        return new ResponseEntity<>(dmrService.createMedicalCase(request), HttpStatus.CREATED);
    }

    @PostMapping("/medical-cases/{medicalCaseId}/join")
    public ResponseEntity<MedicalCaseResponse> joinMedicalCase(
            @PathVariable UUID medicalCaseId,
            @Valid @RequestBody JoinMedicalCaseRequest request
    ) {
        return ResponseEntity.ok(dmrService.joinMedicalCase(medicalCaseId, request));
    }

    @PutMapping("/medical-cases/{medicalCaseId}")
    public ResponseEntity<MedicalCaseResponse> updateMedicalCase(
            @PathVariable UUID medicalCaseId,
            @Valid @RequestBody UpdateMedicalCaseRequest request
    ) {
        return ResponseEntity.ok(dmrService.updateMedicalCase(medicalCaseId, request));
    }

    @DeleteMapping("/medical-cases/{medicalCaseId}")
    public ResponseEntity<Void> deleteMedicalCase(
            @PathVariable UUID medicalCaseId,
            @RequestParam UUID doctorId
    ) {
        dmrService.deleteMedicalCase(medicalCaseId, doctorId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/patients/{patientId}/medical-cases")
    public ResponseEntity<List<MedicalCaseResponse>> getPatientMedicalCases(@PathVariable UUID patientId) {
        return ResponseEntity.ok(dmrService.getMedicalCasesByPatient(patientId));
    }

    @GetMapping("/doctors/{doctorId}/medical-cases")
    public ResponseEntity<List<MedicalCaseResponse>> getDoctorMedicalCases(@PathVariable UUID doctorId) {
        return ResponseEntity.ok(dmrService.getMedicalCasesByDoctor(doctorId));
    }

    @GetMapping("/medical-cases/{medicalCaseId}")
    public ResponseEntity<MedicalCaseDetailsResponse> getMedicalCaseDetails(@PathVariable UUID medicalCaseId) {
        return ResponseEntity.ok(dmrService.getMedicalCaseDetails(medicalCaseId));
    }

    @PostMapping("/medical-cases/{medicalCaseId}/consultations")
    public ResponseEntity<Map<String, UUID>> createConsultation(
            @PathVariable UUID medicalCaseId,
            @Valid @RequestBody CreateConsultationRequest request
    ) {
        return new ResponseEntity<>(Map.of("id", dmrService.createConsultation(medicalCaseId, request)), HttpStatus.CREATED);
    }

    @PutMapping("/consultations/{consultationId}")
    public ResponseEntity<Map<String, UUID>> updateConsultation(
            @PathVariable UUID consultationId,
            @Valid @RequestBody UpdateConsultationRequest request
    ) {
        return ResponseEntity.ok(Map.of("id", dmrService.updateConsultation(consultationId, request)));
    }

    @DeleteMapping("/consultations/{consultationId}")
    public ResponseEntity<Void> deleteConsultation(
            @PathVariable UUID consultationId,
            @RequestParam UUID doctorId
    ) {
        dmrService.deleteConsultation(consultationId, doctorId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/medical-cases/{medicalCaseId}/lab-requests")
    public ResponseEntity<Map<String, UUID>> createLabRequest(
            @PathVariable UUID medicalCaseId,
            @Valid @RequestBody CreateLabRequestRequest request
    ) {
        return new ResponseEntity<>(Map.of("id", dmrService.createLabRequest(medicalCaseId, request)), HttpStatus.CREATED);
    }

    @PutMapping("/lab-requests/{labRequestId}")
    public ResponseEntity<Map<String, UUID>> updateLabRequest(
            @PathVariable UUID labRequestId,
            @Valid @RequestBody UpdateLabRequestRequest request
    ) {
        return ResponseEntity.ok(Map.of("id", dmrService.updateLabRequest(labRequestId, request)));
    }

    @PatchMapping("/lab-requests/{labRequestId}/assign-lab")
    public ResponseEntity<Map<String, UUID>> assignLabToRequest(
            @PathVariable UUID labRequestId,
            @Valid @RequestBody AssignLabRequestRequest request
    ) {
        return ResponseEntity.ok(Map.of("id", dmrService.assignLabToRequest(labRequestId, request)));
    }

    @DeleteMapping("/lab-requests/{labRequestId}")
    public ResponseEntity<Void> deleteLabRequest(
            @PathVariable UUID labRequestId,
            @RequestParam UUID doctorId
    ) {
        dmrService.deleteLabRequest(labRequestId, doctorId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/labs/{laboId}/lab-requests")
    public ResponseEntity<List<LabQueueItemResponse>> getLabReports(@PathVariable UUID laboId) {
        return ResponseEntity.ok(dmrService.getLabReports(laboId));
    }

    @GetMapping("/labs/{laboId}/lab-requests/pending")
    public ResponseEntity<List<LabQueueItemResponse>> getPendingLabRequests(@PathVariable UUID laboId) {
        return ResponseEntity.ok(dmrService.getPendingLabRequests(laboId));
    }

    @GetMapping("/lab-requests/{labRequestId}/summary")
    public ResponseEntity<LabQueueItemResponse> getLabRequestSummary(@PathVariable UUID labRequestId) {
        return ResponseEntity.ok(dmrService.getLabRequestSummary(labRequestId));
    }

    @PostMapping("/medical-cases/{medicalCaseId}/lab-results")
    public ResponseEntity<Map<String, UUID>> createLabResult(
            @PathVariable UUID medicalCaseId,
            @Valid @RequestBody CreateLabResultRequest request
    ) {
        return new ResponseEntity<>(Map.of("id", dmrService.createLabResult(medicalCaseId, request)), HttpStatus.CREATED);
    }

    @PostMapping("/medical-cases/{medicalCaseId}/lab-results/upload")
    public ResponseEntity<Map<String, UUID>> createLabResultWithFile(
            @PathVariable UUID medicalCaseId,
            @RequestParam UUID labRequestId,
            @RequestParam UUID laboId,
            @RequestParam String resultText,
            @RequestParam(required = false) String resultDate,
            @RequestParam("file") MultipartFile file
    ) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Result file is required");
        }

        CreateLabResultRequest request = new CreateLabResultRequest();
        request.setLabRequestId(labRequestId);
        request.setLaboId(laboId);
        request.setResultText(resultText);
        request.setResultDate(
                resultDate == null || resultDate.isBlank()
                        ? LocalDateTime.now()
                        : LocalDateTime.parse(resultDate)
        );

        // Reuse DMR upload behavior similar to profile image uploads, but scoped to DMR resources.
        String uploadedPath = fileStorageService.storeFile(file);
        request.setResultFileUrl(uploadedPath);

        return new ResponseEntity<>(Map.of("id", dmrService.createLabResult(medicalCaseId, request)), HttpStatus.CREATED);
    }

    @PostMapping("/medical-cases/{medicalCaseId}/prescriptions")
    public ResponseEntity<Map<String, UUID>> createPrescription(
            @PathVariable UUID medicalCaseId,
            @Valid @RequestBody CreatePrescriptionRequest request
    ) {
        return new ResponseEntity<>(Map.of("id", dmrService.createPrescription(medicalCaseId, request)), HttpStatus.CREATED);
    }

    @PutMapping("/prescriptions/{prescriptionId}")
    public ResponseEntity<Map<String, UUID>> updatePrescription(
            @PathVariable UUID prescriptionId,
            @Valid @RequestBody UpdatePrescriptionRequest request
    ) {
        return ResponseEntity.ok(Map.of("id", dmrService.updatePrescription(prescriptionId, request)));
    }

    @DeleteMapping("/prescriptions/{prescriptionId}")
    public ResponseEntity<Void> deletePrescription(
            @PathVariable UUID prescriptionId,
            @RequestParam UUID doctorId
    ) {
        dmrService.deletePrescription(prescriptionId, doctorId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/prescriptions/{prescriptionId}/dosages")
    public ResponseEntity<List<DosageResponse>> getPrescriptionDosages(@PathVariable UUID prescriptionId) {
        return ResponseEntity.ok(dmrService.getPrescriptionDosages(prescriptionId));
    }

    @PutMapping("/dosages/{dosageId}")
    public ResponseEntity<DosageResponse> updateDosage(
            @PathVariable UUID dosageId,
            @Valid @RequestBody UpdateDosageRequest request
    ) {
        return ResponseEntity.ok(dmrService.updateDosage(dosageId, request));
    }

    @DeleteMapping("/dosages/{dosageId}")
    public ResponseEntity<Void> deleteDosage(
            @PathVariable UUID dosageId,
            @RequestParam UUID doctorId
    ) {
        dmrService.deleteDosage(dosageId, doctorId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/dosages/{dosageId}/taken")
    public ResponseEntity<DosageResponse> updateDosageTaken(
            @PathVariable UUID dosageId,
            @RequestBody UpdateDosageTakenRequest request
    ) {
        return ResponseEntity.ok(dmrService.updateDosageTaken(dosageId, request));
    }

    @GetMapping("/patients/{patientId}/prescriptions")
    public ResponseEntity<List<Map<String, Object>>> getPatientPrescriptions(@PathVariable UUID patientId) {
        return ResponseEntity.ok(dmrService.getPatientPrescriptions(patientId));
    }
}
