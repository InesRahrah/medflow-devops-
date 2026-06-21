package com.medflow.userservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.ALWAYS)
public class DoctorUserResponse extends BaseUserResponse {
    private String firstName;
    private String lastName;
    private String specialization;
    private String licenseNumber;
    private Integer yearsOfExperience;
    private Double consultationFee;
    private String biography;
    private String clinicAddress;
    private Long hospitalId;
    private String availabilitySchedule;
    private Boolean isverifiedByAdmin;
}
