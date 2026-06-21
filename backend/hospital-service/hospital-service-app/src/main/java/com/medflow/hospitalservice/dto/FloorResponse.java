package com.medflow.hospitalservice.dto;

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
public class FloorResponse {

    private UUID id;
    private UUID hospitalId;
    private Integer floorNumber;
    private String name;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
