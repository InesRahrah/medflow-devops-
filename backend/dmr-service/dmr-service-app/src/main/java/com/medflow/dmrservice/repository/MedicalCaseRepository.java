package com.medflow.dmrservice.repository;

import com.medflow.dmrservice.entity.MedicalCase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MedicalCaseRepository extends JpaRepository<MedicalCase, UUID> {
	List<MedicalCase> findByPatientIdOrderByCreatedAtDesc(UUID patientId);
	List<MedicalCase> findByDoctorIdOrderByCreatedAtDesc(UUID doctorId);
}
