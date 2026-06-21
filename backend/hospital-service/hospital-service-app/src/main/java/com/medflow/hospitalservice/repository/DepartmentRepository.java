package com.medflow.hospitalservice.repository;

import com.medflow.hospitalservice.entity.Department;
import com.medflow.hospitalservice.entity.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, UUID> {
    List<Department> findByHospital(Hospital hospital);

    Optional<Department> findByIdAndHospital(UUID id, Hospital hospital);

    // Hospital isolation methods
    List<Department> findByHospitalId(UUID hospitalId);

    Optional<Department> findByIdAndHospitalId(UUID id, UUID hospitalId);

    long countByHospitalId(UUID hospitalId);
}
