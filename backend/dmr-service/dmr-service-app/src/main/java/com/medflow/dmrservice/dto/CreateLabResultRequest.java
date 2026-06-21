package com.medflow.dmrservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class CreateLabResultRequest {

    @NotNull
    private UUID labRequestId;

    @NotNull
    private UUID laboId;

    @NotBlank
    private String resultText;

    private String resultFileUrl;

    @NotNull
    private LocalDateTime resultDate;
}
