package com.medflow.insuranceservice.repository;

import com.medflow.insuranceservice.entity.Claim;
import com.medflow.insuranceservice.entity.enums.ClaimStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ClaimRepository extends JpaRepository<Claim, Long> {
    List<Claim> findByPatientId(String patientId);
    List<Claim> findByDoctorId(String doctorId);
    List<Claim> findByStatus(ClaimStatus status);
}
