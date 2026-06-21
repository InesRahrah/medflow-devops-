package com.medflow.dmrservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class PrescriptionDosePlanRequest {

    @NotNull
    private UUID medicineId;

    @NotNull
    @Min(0)
    private Integer morning;

    @NotNull
    @Min(0)
    private Integer afternoon;

    @NotNull
    @Min(0)
    private Integer night;

    @NotNull
    @Min(1)
    private Integer days;

    private String doseNotes;
}
