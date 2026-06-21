package com.medflow.dmrservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class UpdateMedicalCaseRequest {

    @NotNull
    private UUID doctorId;

    @NotBlank
    private String name;

    @NotNull
    private LocalDate startDate;

    private LocalDate endDate;
}
