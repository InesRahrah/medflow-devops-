package com.medflow.dmrservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicineIntakeResponse {
    private UUID id;
    private UUID dosageId;
    private UUID medicineId;
    private String medicineName;
    private LocalDate intakeDate;
    private boolean isCompleted;
    private LocalDateTime completedAt;
    private String notes;
}
