package com.medflow.userservice.service.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffJwtInfoResponse {

    private UUID userId;
    private UUID hospitalId;
    private String role;
}
