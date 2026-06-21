package com.medflow.userservice.dto;

import com.medflow.userservice.entity.Region;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class PharmacistRequest extends BaseUserRequest {

    @NotBlank(message = "Pharmacy name is required")
    private String pharmacyName;

    @NotBlank(message = "License number is required")
    private String licenseNumber;

    @NotNull(message = "Region is required")
    private Region region;
}
