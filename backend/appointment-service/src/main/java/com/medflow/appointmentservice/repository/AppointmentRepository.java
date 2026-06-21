package com.medflow.appointmentservice.repository;

import com.medflow.appointmentservice.entity.Appointment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    /**
     * Pessimistic lock: finds an active (non-cancelled/rejected) appointment for a doctor at a given time.
     * The FOR UPDATE lock serializes concurrent booking attempts on the same slot.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Appointment a WHERE a.idDoctor = :doctorId AND a.scheduledAt = :scheduledAt " +
            "AND a.status NOT IN ('CANCELLED', 'LATE_CANCEL', 'REJECTED_BY_DOCTOR', 'REJECTED_BY_PATIENT')")
    Optional<Appointment> findActiveSlotForUpdate(@Param("doctorId") UUID doctorId,
                                                   @Param("scheduledAt") LocalDateTime scheduledAt);

    @Query("SELECT a FROM Appointment a WHERE a.idPatient = :patientId AND a.scheduledAt = :scheduledAt " +
            "AND a.status NOT IN ('CANCELLED', 'LATE_CANCEL', 'REJECTED_BY_DOCTOR', 'REJECTED_BY_PATIENT', 'NO_SHOW')")
    Optional<Appointment> findActivePatientSlot(@Param("patientId") UUID patientId,
                                                @Param("scheduledAt") LocalDateTime scheduledAt);

    boolean existsByIdDoctorAndScheduledAtAndStatusNotIn(UUID idDoctor, LocalDateTime scheduledAt, List<String> statuses);
    List<Appointment> findByIdPatient(UUID idPatient);
    List<Appointment> findByIdDoctorAndStatusOrderByScheduledAtAsc(UUID idDoctor, String status);
    List<Appointment> findByIdDoctorAndStatusInOrderByScheduledAtAsc(UUID idDoctor, List<String> statuses);
    List<Appointment> findByIdDoctorAndScheduledAtBetween(UUID idDoctor, LocalDateTime start, LocalDateTime end);
    List<Appointment> findByScheduledAtBetween(LocalDateTime start, LocalDateTime end);
    List<Appointment> findByStatusAndScheduledAtBefore(String status, LocalDateTime time);
    boolean existsByIdPatient(UUID idPatient);
    boolean existsByIdPatientAndIdDoctor(UUID idPatient, UUID idDoctor);

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.idPatient = :patientId AND a.scheduledAt >= :fromTime " +
           "AND a.status IN ('SCHEDULED', 'PENDING_DOCTOR_CONFIRMATION', 'PENDING_PATIENT_CONFIRMATION')")
    long countActiveFutureAppointments(@Param("patientId") UUID patientId, @Param("fromTime") LocalDateTime fromTime);

    @Query("SELECT a.idPatient, MAX(a.scheduledAt), COUNT(a) FROM Appointment a WHERE a.idDoctor = :doctorId GROUP BY a.idPatient")
    List<Object[]> findPatientSummariesByDoctorId(@Param("doctorId") UUID doctorId);
}