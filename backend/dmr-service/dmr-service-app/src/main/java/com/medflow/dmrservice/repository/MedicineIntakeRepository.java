package com.medflow.dmrservice.repository;

import com.medflow.dmrservice.entity.MedicineIntake;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface MedicineIntakeRepository extends JpaRepository<MedicineIntake, UUID> {
    List<MedicineIntake> findByPatientId(UUID patientId);

    List<MedicineIntake> findByPatientIdAndIntakeDateBetween(
        UUID patientId,
        LocalDate startDate,
        LocalDate endDate
    );

    List<MedicineIntake> findByPatientIdAndIntakeDateAndIsCompleted(
        UUID patientId,
        LocalDate intakeDate,
        boolean isCompleted
    );
}
