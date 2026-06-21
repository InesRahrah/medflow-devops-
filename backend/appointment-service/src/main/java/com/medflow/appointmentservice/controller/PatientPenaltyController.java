package com.medflow.appointmentservice.controller;

import com.medflow.appointmentservice.dto.AppealResponse;
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
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
public class PatientPenaltyController {

    private final PatientPenaltyService patientPenaltyService;

    public static class AppealRequest {
        private String explanation;
        public String getExplanation() { return explanation; }
        public void setExplanation(String explanation) { this.explanation = explanation; }
    }

    @GetMapping("/{patientId}/penalty-profile")
    public ResponseEntity<PatientPenaltyProfileResponse> getPenaltyProfile(@PathVariable UUID patientId) {
        return ResponseEntity.ok(patientPenaltyService.getPatientPenaltyProfile(patientId));
    }

    @PostMapping("/{patientId}/penalties/{eventId}/appeal")
    public ResponseEntity<AppealResponse> submitAppeal(
            @PathVariable UUID patientId,
            @PathVariable Long eventId,
            @RequestBody(required = false) AppealRequest request
    ) {
        String explanation = request != null ? request.getExplanation() : null;
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(patientPenaltyService.submitAppeal(patientId, eventId, explanation));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @GetMapping("/{patientId}/appeals")
    public ResponseEntity<List<AppealResponse>> getMyAppeals(@PathVariable UUID patientId) {
        return ResponseEntity.ok(patientPenaltyService.getMyAppeals(patientId));
    }
}
