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
public class LaboratoryUserResponse extends BaseUserResponse {
    private String labName;
    private String registrationNumber;
    private String address;
    private String accreditation;
    private String openingHours;
    private String supportedTests;
    private Boolean isverifiedByAdmin;
}
