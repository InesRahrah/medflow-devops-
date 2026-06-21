package com.medflow.hospitalservice.mapper;

import com.medflow.hospitalservice.dto.RoomRequest;
import com.medflow.hospitalservice.dto.RoomResponse;
import com.medflow.hospitalservice.entity.Department;
import com.medflow.hospitalservice.entity.Floor;
import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.entity.Room;

public class RoomMapper {

    public static Room toEntity(RoomRequest dto, Hospital hospital, Department department, Floor floor) {
        if (dto == null) {
            return null;
        }

        return Room.builder()
                .roomNumber(dto.getRoomNumber())
                .capacity(dto.getCapacity())
                .type(dto.getType())
                .status(dto.getStatus())
                .hospital(hospital)
                .department(department)
                .floor(floor)
                .build();
    }

    public static RoomResponse toResponse(Room entity) {
        if (entity == null) {
            return null;
        }

        return RoomResponse.builder()
                .id(entity.getId())
                .roomNumber(entity.getRoomNumber())
                .capacity(entity.getCapacity())
                .type(entity.getType())
                .status(entity.getStatus())
                .departmentId(entity.getDepartment() != null ? entity.getDepartment().getId() : null)
                .floorId(entity.getFloor() != null ? entity.getFloor().getId() : null)
                .hospitalId(entity.getHospital() != null ? entity.getHospital().getId() : null)
                .assignedStaff(entity.getAssignedStaff() != null 
                    ? entity.getAssignedStaff().stream()
                        .map(StaffMapper::toResponse)
                        .collect(java.util.stream.Collectors.toList())
                    : java.util.Collections.emptyList())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
