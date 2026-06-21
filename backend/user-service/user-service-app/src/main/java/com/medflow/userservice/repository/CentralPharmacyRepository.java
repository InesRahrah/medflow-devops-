package com.medflow.userservice.repository;

import com.medflow.userservice.entity.CentralPharmacyProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CentralPharmacyRepository extends JpaRepository<CentralPharmacyProfile, UUID> {

    Optional<CentralPharmacyProfile> findByUserId(UUID userId);
}
