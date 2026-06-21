package com.medflow.hospitalservice.repository;

import com.medflow.hospitalservice.entity.Department;
import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffRepository extends JpaRepository<Staff, UUID> {
    List<Staff> findByHospital(Hospital hospital);

    List<Staff> findByDepartment(Department department);

    Optional<Staff> findByIdAndHospital(UUID id, Hospital hospital);

    Optional<Staff> findByUserId(UUID userId);

    // Hospital isolation methods
    List<Staff> findByHospitalId(UUID hospitalId);

    Optional<Staff> findByIdAndHospitalId(UUID id, UUID hospitalId);

    long countByHospitalId(UUID hospitalId);
}
