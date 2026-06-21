package com.medflow.dmrservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.util.UUID;

@Data
public class JoinMedicalCaseRequest {

    @NotBlank
    @Pattern(regexp = "^[A-Za-z0-9]{5}$", message = "Access code must be 5 alphanumeric characters")
    private String accessCode;

    @NotNull
    private UUID doctorId;
}
