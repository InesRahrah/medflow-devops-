package com.medflow.userservice.repository;

import com.medflow.userservice.entity.PatientProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface PatientProfileRepository extends JpaRepository<PatientProfile, UUID> {
}
