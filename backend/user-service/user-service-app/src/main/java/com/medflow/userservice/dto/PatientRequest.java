package com.medflow.userservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.DecimalMin;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@ToString(callSuper = true)
public class PatientRequest extends BaseUserRequest {
    @NotBlank(message = "First name is required", groups = {OnCreate.class, OnUpdate.class})
    private String firstName;

    @NotBlank(message = "Last name is required", groups = {OnCreate.class, OnUpdate.class})
    private String lastName;

    @NotNull(message = "Date of birth is required", groups = {OnCreate.class, OnUpdate.class})
    @Past(message = "Date of birth must be in the past", groups = {OnCreate.class, OnUpdate.class})
    private LocalDate dateOfBirth;

    @NotBlank(message = "Gender is required", groups = {OnCreate.class, OnUpdate.class})
    private String gender;

    @NotBlank(message = "Blood type is required", groups = {OnCreate.class, OnUpdate.class})
    private String bloodType;
    private String allergies;
    private String chronicDiseases;
    @Min(value = 50, message = "Height must be at least 50", groups = {OnCreate.class, OnUpdate.class})
    private Double height;
    
    @DecimalMin(value = "2.5", message = "Weight must be at least 2.5", groups = {OnCreate.class, OnUpdate.class})
    private Double weight;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private Long insuranceId;
    private Long primaryDoctorId;
}
