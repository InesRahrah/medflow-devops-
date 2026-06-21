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
public class NurseRoomResponse {

    private UUID id;
    private String roomNumber;
    private RoomStatus status;
    private String departmentName;
    private String floorName;
    private Integer capacity;
}
