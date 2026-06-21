package com.medflow.insuranceservice.controller;

import com.medflow.insuranceservice.entity.Claim;
import com.medflow.insuranceservice.entity.enums.ClaimStatus;
import com.medflow.insuranceservice.service.ClaimService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/insurance")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class InsuranceController {

    private final ClaimService claimService;

    @PostMapping("/claims")
    public ResponseEntity<Claim> createClaim(@RequestBody Claim claim) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(claimService.createClaim(claim));
    }

    @GetMapping("/claims")
    public ResponseEntity<List<Claim>> getAllClaims() {
        return ResponseEntity.ok(claimService.getAllClaims());
    }

    @GetMapping("/claims/{id}")
    public ResponseEntity<Claim> getClaimById(@PathVariable Long id) {
        return ResponseEntity.ok(claimService.getClaimById(id));
    }

    @GetMapping("/claims/patient/{patientId}")
    public ResponseEntity<List<Claim>> getByPatient(@PathVariable String patientId) {
        return ResponseEntity.ok(claimService.getClaimsByPatient(patientId));
    }

    @GetMapping("/claims/doctor/{doctorId}")
    public ResponseEntity<List<Claim>> getByDoctor(@PathVariable String doctorId) {
        return ResponseEntity.ok(claimService.getClaimsByDoctor(doctorId));
    }

    @GetMapping("/claims/status/{status}")
    public ResponseEntity<List<Claim>> getByStatus(@PathVariable ClaimStatus status) {
        return ResponseEntity.ok(claimService.getClaimsByStatus(status));
    }

    @PutMapping("/claims/{id}")
    public ResponseEntity<Claim> updateClaim(@PathVariable Long id, @RequestBody Claim claim) {
        return ResponseEntity.ok(claimService.updateClaim(id, claim));
    }

    @PatchMapping("/claims/{id}/status")
    public ResponseEntity<Claim> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        ClaimStatus status = ClaimStatus.valueOf(body.get("status"));
        String reason = body.get("rejectionReason");
        return ResponseEntity.ok(claimService.updateStatus(id, status, reason));
    }

    @DeleteMapping("/claims/{id}")
    public ResponseEntity<Void> deleteClaim(@PathVariable Long id) {
        claimService.deleteClaim(id);
        return ResponseEntity.noContent().build();
    }
}
