package com.medflow.hospitalservice.dto;

import com.medflow.hospitalservice.entity.enums.BedStatus;
import com.medflow.hospitalservice.entity.enums.BedType;
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
public class BedResponse {

    private UUID id;
    private String label;
    private BedStatus status;
    private BedType type;
    private String notes;
    private Double x;
    private Double y;
    private Double width;
    private Double height;
    private UUID roomId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
