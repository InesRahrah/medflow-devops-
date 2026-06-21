package com.medflow.dmrservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class CreateConsultationRequest {

    @NotNull
    private UUID doctorId;

    @NotNull
    private LocalDateTime consultationDate;

    private String notes;
}
