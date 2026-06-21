package com.medflow.insuranceservice.service;

import com.medflow.insuranceservice.entity.Claim;
import com.medflow.insuranceservice.entity.enums.ClaimStatus;
import java.util.List;

public interface ClaimService {
    Claim createClaim(Claim claim);
    Claim updateClaim(Long id, Claim claim);
    Claim updateStatus(Long id, ClaimStatus status, String rejectionReason);
    void deleteClaim(Long id);
    List<Claim> getAllClaims();
    Claim getClaimById(Long id);
    List<Claim> getClaimsByPatient(String patientId);
    List<Claim> getClaimsByDoctor(String doctorId);
    List<Claim> getClaimsByStatus(ClaimStatus status);
}
