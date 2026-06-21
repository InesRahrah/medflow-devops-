package com.medflow.hospitalservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffDetailResponse {

    private StaffResponse staff;
    private List<StaffAssignedRoomResponse> assignedRooms;
    private int assignedRoomCount;
    private String activitySummary;
}
