package com.medflow.userservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@ToString(callSuper = true)
public class DoctorRequest extends BaseUserRequest {
    @NotBlank(message = "First name is required", groups = {OnCreate.class, OnUpdate.class})
    private String firstName;

    @NotBlank(message = "Last name is required", groups = {OnCreate.class, OnUpdate.class})
    private String lastName;

    @NotBlank(message = "Specialization is required", groups = {OnCreate.class, OnUpdate.class})
    private String specialization;

    @NotBlank(message = "License number is required", groups = {OnCreate.class, OnUpdate.class})
    private String licenseNumber;

    @Min(value = 0, message = "Years of experience cannot be negative", groups = {OnCreate.class, OnUpdate.class})
    private Integer yearsOfExperience;
    private Double consultationFee;
    private String biography;
    private String clinicAddress;
    private Long hospitalId;
    private String availabilitySchedule;
}
