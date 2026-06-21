package com.medflow.dmrservice.repository;

import com.medflow.dmrservice.entity.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ConsultationRepository extends JpaRepository<Consultation, UUID> {
    List<Consultation> findByMedicalCaseId(UUID medicalCaseId);
    List<Consultation> findByMedicalCaseIdOrderByConsultationDateAsc(UUID medicalCaseId);
    void deleteByMedicalCaseId(UUID medicalCaseId);
}
