package com.medflow.appointmentservice.repository;

import com.medflow.appointmentservice.entity.AppealStatus;
import com.medflow.appointmentservice.entity.PenaltyAppeal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PenaltyAppealRepository extends JpaRepository<PenaltyAppeal, Long> {

    List<PenaltyAppeal> findByPatientIdOrderBySubmittedAtDesc(UUID patientId);

    List<PenaltyAppeal> findByStatusOrderBySubmittedAtAsc(AppealStatus status);

    Optional<PenaltyAppeal> findByPenaltyEventIdAndPatientId(Long penaltyEventId, UUID patientId);

    boolean existsByPenaltyEventIdAndPatientIdAndStatusIn(Long penaltyEventId, UUID patientId, List<AppealStatus> statuses);
}
