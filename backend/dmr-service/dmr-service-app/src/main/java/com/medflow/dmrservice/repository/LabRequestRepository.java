package com.medflow.dmrservice.repository;

import com.medflow.dmrservice.entity.LabRequest;
import com.medflow.dmrservice.entity.LabRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LabRequestRepository extends JpaRepository<LabRequest, UUID> {
    List<LabRequest> findByMedicalCaseId(UUID medicalCaseId);
    List<LabRequest> findByMedicalCaseIdOrderByCreatedAtAsc(UUID medicalCaseId);
    List<LabRequest> findByLaboIdOrderByCreatedAtDesc(UUID laboId);
    List<LabRequest> findByLaboIdAndStatusOrderByCreatedAtDesc(UUID laboId, LabRequestStatus status);
    void deleteByMedicalCaseId(UUID medicalCaseId);
}
