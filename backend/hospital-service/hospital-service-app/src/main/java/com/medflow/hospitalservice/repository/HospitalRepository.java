package com.medflow.hospitalservice.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.medflow.hospitalservice.entity.Hospital;

@Repository
public interface HospitalRepository extends JpaRepository<Hospital, UUID> {
    java.util.Optional<Hospital> findByUserId(UUID userId);
    boolean existsByUserId(UUID userId);
}
