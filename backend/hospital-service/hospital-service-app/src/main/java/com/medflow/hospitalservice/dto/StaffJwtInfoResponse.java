package com.medflow.hospitalservice.dto;

import com.medflow.hospitalservice.entity.enums.StaffRole;
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
    private StaffRole role;
}
