package com.medflow.userservice.repository;

import com.medflow.userservice.entity.LaboratoryProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface LaboratoryProfileRepository extends JpaRepository<LaboratoryProfile, UUID> {
    boolean existsByRegistrationNumber(String registrationNumber);
}
