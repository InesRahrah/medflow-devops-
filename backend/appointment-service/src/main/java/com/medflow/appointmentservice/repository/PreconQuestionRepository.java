package com.medflow.appointmentservice.repository;

import com.medflow.appointmentservice.entity.PreconQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PreconQuestionRepository extends JpaRepository<PreconQuestion, Long> {
	List<PreconQuestion> findByTemplateIdOrderByOrderIndexAsc(Long templateId);
	void deleteByTemplateId(Long templateId);
}