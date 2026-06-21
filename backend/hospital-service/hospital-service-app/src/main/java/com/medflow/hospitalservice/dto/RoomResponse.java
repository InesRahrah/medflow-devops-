package com.medflow.hospitalservice.dto;

import com.medflow.hospitalservice.entity.enums.RoomStatus;
import com.medflow.hospitalservice.entity.enums.RoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomResponse {

    private UUID id;
    private String roomNumber;
    private Integer capacity;
    private RoomType type;
    private RoomStatus status;
    private UUID departmentId;
    private UUID floorId;
    private UUID hospitalId;
    private java.util.List<StaffResponse> assignedStaff;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
