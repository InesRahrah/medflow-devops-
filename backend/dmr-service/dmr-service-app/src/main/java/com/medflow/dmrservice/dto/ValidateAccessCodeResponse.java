package com.medflow.dmrservice.dto;

import lombok.Builder;
import lombok.Value;

import java.util.UUID;

@Value
@Builder
public class ValidateAccessCodeResponse {
    boolean valid;
    UUID patientId;
}
