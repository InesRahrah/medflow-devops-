package com.medflow.userservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.ALWAYS)
public class PatientUserResponse extends BaseUserResponse {
    private String firstName;
    private String lastName;
    private LocalDate dateOfBirth;
    private String gender;
    private String bloodType;
    private String allergies;
    private String chronicDiseases;
    private Double height;
    private Double weight;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private Long insuranceId;
    private Long primaryDoctorId;
}
