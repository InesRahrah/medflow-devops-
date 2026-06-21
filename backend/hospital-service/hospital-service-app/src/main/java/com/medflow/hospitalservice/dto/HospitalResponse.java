package com.medflow.hospitalservice.dto;

import com.medflow.hospitalservice.entity.enums.HospitalStatus;
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
public class HospitalResponse {

    private UUID id;
    private UUID userId;
    private String name;
    private HospitalStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
