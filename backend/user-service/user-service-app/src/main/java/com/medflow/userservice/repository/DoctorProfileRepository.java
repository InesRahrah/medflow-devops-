package com.medflow.userservice.repository;

import com.medflow.userservice.entity.DoctorProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, UUID> {
    boolean existsByLicenseNumber(String licenseNumber);
}
