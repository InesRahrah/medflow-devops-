package com.medflow.dmrservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MedicineIntakeRequest {
    private String dosageId;
    private LocalDate intakeDate;
    private boolean isCompleted;
    private String notes;
}
