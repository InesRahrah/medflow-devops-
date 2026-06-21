package com.medflow.hospitalservice.mapper;

import com.medflow.hospitalservice.dto.HospitalRequest;
import com.medflow.hospitalservice.dto.HospitalResponse;
import com.medflow.hospitalservice.entity.Hospital;

import java.util.UUID;

public class HospitalMapper {

    public static Hospital toEntity(HospitalRequest dto, UUID userId) {
        if (dto == null) {
            return null;
        }

        return Hospital.builder()
                .userId(userId)
                .name(dto.getName())
                .status(dto.getStatus())
                .build();
    }

    public static HospitalResponse toResponse(Hospital entity) {
        if (entity == null) {
            return null;
        }

        return HospitalResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .name(entity.getName())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
