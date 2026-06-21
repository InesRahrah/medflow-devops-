package com.medflow.dmrservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class CreatePrescriptionRequest {

    @NotNull
    private UUID doctorId;

    private String notes;

    @NotEmpty
    @Valid
    private List<PrescriptionDosePlanRequest> dosePlans;
}
