package com.medflow.dmrservice.repository;

import com.medflow.dmrservice.entity.LabResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LabResultRepository extends JpaRepository<LabResult, UUID> {
    List<LabResult> findByMedicalCaseId(UUID medicalCaseId);
    List<LabResult> findByMedicalCaseIdOrderByResultDateAsc(UUID medicalCaseId);
    void deleteByMedicalCaseId(UUID medicalCaseId);
}
