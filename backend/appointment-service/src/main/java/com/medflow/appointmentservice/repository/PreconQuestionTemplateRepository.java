package com.medflow.appointmentservice.repository;

import com.medflow.appointmentservice.entity.PreconQuestionTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PreconQuestionTemplateRepository extends JpaRepository<PreconQuestionTemplate, Long> {
    List<PreconQuestionTemplate> findByDoctorId(Long doctorId);
    Optional<PreconQuestionTemplate> findFirstByDoctorIdAndIsActiveTrueOrderByVersionDescIdDesc(Long doctorId);
}