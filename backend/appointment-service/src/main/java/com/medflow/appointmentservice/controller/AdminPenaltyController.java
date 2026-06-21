package com.medflow.appointmentservice.controller;

import com.medflow.appointmentservice.dto.AppealResponse;
import com.medflow.appointmentservice.dto.FlaggedPatientSummary;
import com.medflow.appointmentservice.dto.PatientPenaltyProfileResponse;
import com.medflow.appointmentservice.service.PatientPenaltyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/patients")
@RequiredArgsConstructor
public class AdminPenaltyController {

    private final PatientPenaltyService patientPenaltyService;
    
    public static class AppealDecisionRequest {
        private String adminNote;
        public String getAdminNote() { return adminNote; }
        public void setAdminNote(String adminNote) { this.adminNote = adminNote; }
    }

    @GetMapping("/penalties/flagged")
    public ResponseEntity<List<FlaggedPatientSummary>> getFlaggedPatients() {
        return ResponseEntity.ok(patientPenaltyService.getFlaggedPatients());
    }

    // ---- Appeals ----

    @GetMapping("/penalties/appeals/pending")
    public ResponseEntity<List<AppealResponse>> getPendingAppeals() {
        return ResponseEntity.ok(patientPenaltyService.getPendingAppeals());
    }

    @PostMapping("/penalties/appeals/{appealId}/approve")
    public ResponseEntity<AppealResponse> approveAppeal(
            @PathVariable Long appealId,
            @RequestBody(required = false) AppealDecisionRequest request
    ) {
        String note = request != null ? request.getAdminNote() : null;
        try {
            return ResponseEntity.ok(patientPenaltyService.decideAppeal(appealId, true, note));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @PostMapping("/penalties/appeals/{appealId}/reject")
    public ResponseEntity<AppealResponse> rejectAppeal(
            @PathVariable Long appealId,
            @RequestBody(required = false) AppealDecisionRequest request
    ) {
        String note = request != null ? request.getAdminNote() : null;
        try {
            return ResponseEntity.ok(patientPenaltyService.decideAppeal(appealId, false, note));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }
}
