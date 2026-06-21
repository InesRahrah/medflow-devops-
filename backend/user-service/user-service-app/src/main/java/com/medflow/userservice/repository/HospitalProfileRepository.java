package com.medflow.userservice.repository;

import com.medflow.userservice.entity.HospitalProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface HospitalProfileRepository extends JpaRepository<HospitalProfile, UUID> {
    boolean existsByRegistrationNumber(String registrationNumber);

    Optional<HospitalProfile> findByUserId(UUID userId);
}
