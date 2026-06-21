package com.medflow.dmrservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class AssignLabRequestRequest {

    @NotNull
    private UUID patientId;

    @NotNull
    private UUID laboId;
}
