package com.medflow.hospitalservice.mapper;

import com.medflow.hospitalservice.dto.DepartmentRequest;
import com.medflow.hospitalservice.dto.DepartmentResponse;
import com.medflow.hospitalservice.entity.Department;
import com.medflow.hospitalservice.entity.Hospital;

public class DepartmentMapper {

    public static Department toEntity(DepartmentRequest dto, Hospital hospital) {
        if (dto == null) {
            return null;
        }

        return Department.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .color(dto.getColor())
                .status(dto.getStatus())
                .hospital(hospital)
                .build();
    }

    public static DepartmentResponse toResponse(Department entity) {
        if (entity == null) {
            return null;
        }

        return DepartmentResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .color(entity.getColor())
                .status(entity.getStatus())
                .hospitalId(entity.getHospital() != null ? entity.getHospital().getId() : null)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public static DepartmentResponse toResponseWithStats(
            Department entity,
            int roomCount,
            int bedCount,
            int occupiedBedCount,
            double occupancyRate) {
        DepartmentResponse base = toResponse(entity);
        if (base == null) {
            return null;
        }

        base.setRoomCount(roomCount);
        base.setBedCount(bedCount);
        base.setOccupiedBedCount(occupiedBedCount);
        base.setOccupancyRate(occupancyRate);
        return base;
    }
}
