package com.medflow.hospitalservice.dto;

import com.medflow.hospitalservice.entity.enums.BedStatus;
import com.medflow.hospitalservice.entity.enums.BedType;
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
public class BedRequest {

    @NotBlank(message = "Bed label is required")
    @Size(min = 2, max = 30, message = "Bed label must be between 2 and 30 characters")
    private String label;

    @NotNull(message = "Bed status is required")
    private BedStatus status;

    private BedType type;
    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;

    private Double x;
    private Double y;
    private Double width;
    private Double height;

    @NotNull(message = "Room ID is required")
    private UUID roomId;
}
