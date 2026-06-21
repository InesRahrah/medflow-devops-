package com.medflow.appointmentservice.repository;

import com.medflow.appointmentservice.entity.Preconsultation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PreconsultationRepository extends JpaRepository<Preconsultation, Long> {
	Optional<Preconsultation> findByAppointmentIdAp(Long appointmentId);
	List<Preconsultation> findByAppointmentIdApIn(List<Long> appointmentIds);
}