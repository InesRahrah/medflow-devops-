package com.medflow.hospitalservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffRoomAssignmentRequest {

    @NotNull(message = "roomIds is required")
    private List<UUID> roomIds;
}
