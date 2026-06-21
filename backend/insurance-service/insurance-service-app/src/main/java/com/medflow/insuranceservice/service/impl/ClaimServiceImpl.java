package com.medflow.insuranceservice.service.impl;

import com.medflow.insuranceservice.entity.Claim;
import com.medflow.insuranceservice.entity.enums.ClaimStatus;
import com.medflow.insuranceservice.exception.ClaimNotFoundException;
import com.medflow.insuranceservice.repository.ClaimRepository;
import com.medflow.insuranceservice.service.ClaimService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClaimServiceImpl implements ClaimService {

    private final ClaimRepository claimRepository;

    @Override
    public Claim createClaim(Claim claim) {
        claim.setStatus(ClaimStatus.PENDING);
        return claimRepository.save(claim);
    }

    @Override
    public Claim updateClaim(Long id, Claim updated) {
        Claim existing = claimRepository.findById(id)
                .orElseThrow(() -> new ClaimNotFoundException(id));
        existing.setPatientName(updated.getPatientName());
        existing.setPatientEmail(updated.getPatientEmail());
        existing.setPatientPhone(updated.getPatientPhone());
        existing.setInsuranceCompany(updated.getInsuranceCompany());
        existing.setDescription(updated.getDescription());
        existing.setAmount(updated.getAmount());
        return claimRepository.save(existing);
    }

    @Override
    public Claim updateStatus(Long id, ClaimStatus status, String rejectionReason) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new ClaimNotFoundException(id));
        claim.setStatus(status);
        if (rejectionReason != null && !rejectionReason.isBlank())
            claim.setRejectionReason(rejectionReason);
        if (status == ClaimStatus.PAID)
            claim.setPaymentDate(LocalDateTime.now());
        return claimRepository.save(claim);
    }

    @Override
    public void deleteClaim(Long id) {
        if (!claimRepository.existsById(id))
            throw new ClaimNotFoundException(id);
        claimRepository.deleteById(id);
    }

    @Override
    public List<Claim> getAllClaims() { return claimRepository.findAll(); }

    @Override
    public Claim getClaimById(Long id) {
        return claimRepository.findById(id)
                .orElseThrow(() -> new ClaimNotFoundException(id));
    }

    @Override
    public List<Claim> getClaimsByPatient(String patientId) {
        return claimRepository.findByPatientId(patientId);
    }

    @Override
    public List<Claim> getClaimsByDoctor(String doctorId) {
        return claimRepository.findByDoctorId(doctorId);
    }

    @Override
    public List<Claim> getClaimsByStatus(ClaimStatus status) {
        return claimRepository.findByStatus(status);
    }
}
