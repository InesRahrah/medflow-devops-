package com.medflow.userservice.repository;

import com.medflow.userservice.entity.InsuranceProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface InsuranceProfileRepository extends JpaRepository<InsuranceProfile, UUID> {
    boolean existsByRegistrationNumber(String registrationNumber);
}
