package com.medflow.dmrservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class UpdatePrescriptionRequest {
    @NotNull
    private UUID doctorId;

    private String notes;
}
