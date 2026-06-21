package com.medflow.hospitalservice.mapper;

import com.medflow.hospitalservice.dto.FloorRequest;
import com.medflow.hospitalservice.dto.FloorResponse;
import com.medflow.hospitalservice.entity.Floor;
import com.medflow.hospitalservice.entity.Hospital;

public class FloorMapper {

    public static Floor toEntity(FloorRequest dto, Hospital hospital) {
        if (dto == null) {
            return null;
        }

        return Floor.builder()
                .floorNumber(dto.getFloorNumber())
                .name(dto.getName())
                .hospital(hospital)
                .build();
    }

    public static FloorResponse toResponse(Floor entity) {
        if (entity == null) {
            return null;
        }

        return FloorResponse.builder()
                .id(entity.getId())
                .floorNumber(entity.getFloorNumber())
                .name(entity.getName())
                .hospitalId(entity.getHospital() != null ? entity.getHospital().getId() : null)
                .build();
    }
}
