package com.medflow.dmrservice.repository;

import com.medflow.dmrservice.entity.CaseMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CaseMemberRepository extends JpaRepository<CaseMember, UUID> {
	List<CaseMember> findByMedicalCaseId(UUID medicalCaseId);
	List<CaseMember> findByMemberId(UUID memberId);
	boolean existsByMedicalCaseIdAndMemberId(UUID medicalCaseId, UUID memberId);
	void deleteByMedicalCaseId(UUID medicalCaseId);
}
