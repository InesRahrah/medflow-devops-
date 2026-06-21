package com.medflow.hospitalservice.mapper;

import com.medflow.hospitalservice.dto.StaffRequest;
import com.medflow.hospitalservice.dto.StaffResponse;
import com.medflow.hospitalservice.entity.Department;
import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.entity.Staff;

public class StaffMapper {

    public static Staff toEntity(StaffRequest dto, Hospital hospital, Department department) {
        if (dto == null) {
            return null;
        }

        return Staff.builder()
                .userId(dto.getUserId())
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .hospital(hospital)
                .department(department)
                .role(dto.getRole())
                .employmentType(dto.getEmploymentType())
                .status(dto.getStatus())
                .build();
    }

    public static StaffResponse toResponse(Staff entity) {
        if (entity == null) {
            return null;
        }

        return StaffResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .firstName(entity.getFirstName())
                .lastName(entity.getLastName())
                .hospitalId(entity.getHospital() != null ? entity.getHospital().getId() : null)
                .departmentId(entity.getDepartment() != null ? entity.getDepartment().getId() : null)
                .role(entity.getRole())
                .employmentType(entity.getEmploymentType())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
