package com.medflow.hospitalservice.dto;

import com.medflow.hospitalservice.entity.enums.DepartmentStatus;
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
public class DepartmentResponse {

    private UUID id;
    private String name;
    private String description;
    private String color;
    private DepartmentStatus status;
    private UUID hospitalId;
    private Integer roomCount;
    private Integer bedCount;
    private Integer occupiedBedCount;
    private Double occupancyRate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
