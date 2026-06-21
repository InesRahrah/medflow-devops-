package com.medflow.hospitalservice.dto.integration;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateStaffUserResponse {

    private UUID userId;
    private String email;
    private boolean passwordGenerated;
    private String generatedPassword;
}
