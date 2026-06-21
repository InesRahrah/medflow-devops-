package com.medflow.userservice.dto;

import lombok.Builder;
import lombok.Value;

import java.util.UUID;

@Value
@Builder
public class ValidateAccessCodeResponse {
    boolean valid;
    UUID patientId;
}
