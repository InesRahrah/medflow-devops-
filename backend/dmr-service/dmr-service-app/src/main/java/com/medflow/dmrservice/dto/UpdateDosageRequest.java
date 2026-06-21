package com.medflow.dmrservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class UpdateDosageRequest {
    @NotNull
    private UUID doctorId;

    @NotBlank
    private String quantity;

    private String doseNotes;

    @NotNull
    private LocalDateTime time;

    @NotNull
    private Boolean taken;
}
