package com.medflow.appointmentservice.repository;

import com.medflow.appointmentservice.entity.PreconsultationAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PreconsultationAnswerRepository extends JpaRepository<PreconsultationAnswer, Long> {
    List<PreconsultationAnswer> findByResponseId(Long responseId);
    List<PreconsultationAnswer> findByResponseIdIn(List<Long> responseIds);
}
