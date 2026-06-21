package com.medflow.hospitalservice.service;

import com.medflow.hospitalservice.dto.DepartmentDeleteActionRequest;
import com.medflow.hospitalservice.dto.DepartmentResponse;
import com.medflow.hospitalservice.entity.Department;
import com.medflow.hospitalservice.entity.Hospital;

import java.util.List;
import java.util.UUID;

public interface DepartmentService {
    Department create(Department department);

    List<Department> getAll();

    List<Department> getByHospital(Hospital hospital);

    Department getById(UUID id);

    Department getByIdAndHospital(UUID id, Hospital hospital);

    Department update(UUID id, Department department);

    Department update(UUID id, Department department, Hospital hospital);

    void delete(UUID id);

    void delete(UUID id, Hospital hospital);

    void deleteWithAction(UUID id, Hospital hospital, DepartmentDeleteActionRequest request);

    DepartmentResponse toResponseWithStats(Department department);

    List<DepartmentResponse> getByHospitalWithStats(Hospital hospital);
}