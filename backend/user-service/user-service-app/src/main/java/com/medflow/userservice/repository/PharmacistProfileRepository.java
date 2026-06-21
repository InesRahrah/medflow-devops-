package com.medflow.userservice.repository;

import com.medflow.userservice.entity.PharmacistProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface PharmacistProfileRepository extends JpaRepository<PharmacistProfile, UUID> {
}
