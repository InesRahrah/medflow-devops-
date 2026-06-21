package com.medflow.dmrservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class CreateMedicalCaseRequest {

    @NotBlank
    @Pattern(regexp = "^[A-Za-z0-9]{5}$", message = "Access code must be 5 alphanumeric characters")
    private String accessCode;

    @NotNull
    private UUID doctorId;

    @NotBlank
    private String name;

    @NotNull
    private LocalDate startDate;

    private LocalDate endDate;

    private List<UUID> memberIds;
}
