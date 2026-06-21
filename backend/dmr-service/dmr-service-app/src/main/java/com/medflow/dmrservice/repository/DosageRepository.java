package com.medflow.dmrservice.repository;

import com.medflow.dmrservice.entity.Dosage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DosageRepository extends JpaRepository<Dosage, UUID> {
    List<Dosage> findByPrescriptionIdOrderByTimeAsc(UUID prescriptionId);
    List<Dosage> findByPrescriptionMedicalCaseIdOrderByTimeAsc(UUID medicalCaseId);
    void deleteByPrescriptionId(UUID prescriptionId);
}
