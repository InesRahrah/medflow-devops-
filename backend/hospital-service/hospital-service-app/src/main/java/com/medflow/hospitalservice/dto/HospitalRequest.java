package com.medflow.hospitalservice.dto;

import com.medflow.hospitalservice.entity.enums.HospitalStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HospitalRequest {

    @NotBlank(message = "Hospital name is required")
    private String name;

    @NotNull(message = "Hospital status is required")
    private HospitalStatus status;
}
