package com.medflow.userservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@ToString(callSuper = true)
public class LaboratoryRequest extends BaseUserRequest {
    @NotBlank(message = "Laboratory name is required", groups = {OnCreate.class, OnUpdate.class})
    private String labName;

    @NotBlank(message = "Registration number is required", groups = {OnCreate.class, OnUpdate.class})
    private String registrationNumber;

    @NotBlank(message = "Address is required", groups = {OnCreate.class, OnUpdate.class})
    private String address;

    private String accreditation;
    private String openingHours;

    @NotBlank(message = "Supported tests is required", groups = {OnCreate.class, OnUpdate.class})
    private String supportedTests;
}
