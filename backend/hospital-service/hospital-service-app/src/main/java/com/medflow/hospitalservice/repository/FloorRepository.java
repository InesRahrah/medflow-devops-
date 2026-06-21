package com.medflow.hospitalservice.repository;

import com.medflow.hospitalservice.entity.Floor;
import com.medflow.hospitalservice.entity.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FloorRepository extends JpaRepository<Floor, UUID> {
    List<Floor> findByHospital(Hospital hospital);

    // Hospital isolation methods
    List<Floor> findByHospitalId(UUID hospitalId);

    Optional<Floor> findByIdAndHospitalId(UUID id, UUID hospitalId);

    long countByHospitalId(UUID hospitalId);
}
