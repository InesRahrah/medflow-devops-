package com.medflow.userservice.repository;

import com.medflow.userservice.entity.PatientAccessCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PatientAccessCodeRepository extends JpaRepository<PatientAccessCode, UUID> {
    Optional<PatientAccessCode> findByPatient_Id(UUID patientId);
    Optional<PatientAccessCode> findByCodeValue(String codeValue);
    boolean existsByCodeValue(String codeValue);
}
