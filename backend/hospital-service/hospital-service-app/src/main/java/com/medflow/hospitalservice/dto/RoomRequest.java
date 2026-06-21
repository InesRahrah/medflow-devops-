package com.medflow.hospitalservice.dto;

import com.medflow.hospitalservice.entity.enums.RoomStatus;
import com.medflow.hospitalservice.entity.enums.RoomType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomRequest {

    @NotBlank(message = "Room number is required")
    @Size(min = 2, max = 30, message = "Room number must be between 2 and 30 characters")
    private String roomNumber;

    @NotNull(message = "Capacity is required")
    @Min(value = 0, message = "Capacity must be at least 0")
    private Integer capacity;

    @NotNull(message = "Room type is required")
    private RoomType type;

    @NotNull(message = "Room status is required")
    private RoomStatus status;

    @NotNull(message = "Department ID is required")
    private UUID departmentId;

    @NotNull(message = "Floor ID is required")
    private UUID floorId;
}
