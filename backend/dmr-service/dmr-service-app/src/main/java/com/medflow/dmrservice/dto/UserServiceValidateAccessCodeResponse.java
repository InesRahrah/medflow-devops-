package com.medflow.dmrservice.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class UserServiceValidateAccessCodeResponse {
    private boolean valid;
    private UUID patientId;
}
