package com.medflow.dmrservice.repository;

import com.medflow.dmrservice.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PrescriptionRepository extends JpaRepository<Prescription, UUID> {
    List<Prescription> findByMedicalCaseId(UUID medicalCaseId);
    List<Prescription> findByMedicalCaseIdOrderByCreatedAtAsc(UUID medicalCaseId);
    void deleteByMedicalCaseId(UUID medicalCaseId);
}
