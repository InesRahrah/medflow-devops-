package com.medflow.userservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@ToString(callSuper = true)
public class InsuranceRequest extends BaseUserRequest {

    @NotBlank(message = "Company name is required", groups = {OnCreate.class, OnUpdate.class})
    private String companyName;

    @NotBlank(message = "Registration number is required", groups = {OnCreate.class, OnUpdate.class})
    private String registrationNumber;

    private String address;

    @NotEmpty(message = "Coverage types are required", groups = {OnCreate.class, OnUpdate.class})
    private List<String> coverageTypes;  // ← List<String> au lieu de String

    private String claimProcessDescription;
}
