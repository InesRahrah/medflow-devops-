package com.medflow.appointmentservice.repository;

import com.medflow.appointmentservice.entity.PenaltyEvent;
import com.medflow.appointmentservice.entity.PenaltyEventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PenaltyEventRepository extends JpaRepository<PenaltyEvent, Long> {

    List<PenaltyEvent> findByPatientIdAndOccurredAtAfterOrderByOccurredAtDesc(UUID patientId, LocalDateTime occurredAfter);

    List<PenaltyEvent> findTop20ByPatientIdOrderByOccurredAtDesc(UUID patientId);

    long countByPatientIdAndEventTypeInAndOccurredAtAfterAndWaivedFalse(
            UUID patientId,
            List<PenaltyEventType> eventTypes,
            LocalDateTime occurredAfter
    );

    Optional<PenaltyEvent> findFirstByPatientIdAndEventTypeInAndWaivedFalseOrderByOccurredAtDesc(
            UUID patientId,
            List<PenaltyEventType> eventTypes
    );

    List<PenaltyEvent> findByPatientIdAndEventTypeInAndWaivedFalseOrderByOccurredAtDesc(
            UUID patientId,
            List<PenaltyEventType> eventTypes
    );

    @Query("SELECT DISTINCT e.patientId FROM PenaltyEvent e")
    List<UUID> findDistinctPatientIdsWithPenalties();
}
