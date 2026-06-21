package com.medflow.hospitalservice.dto;

import com.medflow.hospitalservice.entity.enums.RoomStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffAssignedRoomResponse {

    private UUID roomId;
    private String roomNumber;
    private RoomStatus roomStatus;
    private UUID floorId;
    private String floorName;
    private UUID departmentId;
    private String departmentName;
}
