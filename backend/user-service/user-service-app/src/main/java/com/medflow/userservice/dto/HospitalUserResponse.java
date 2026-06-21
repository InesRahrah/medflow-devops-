package com.medflow.userservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.medflow.userservice.entity.HospitalProfile.HospitalType;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.ALWAYS)
public class HospitalUserResponse extends BaseUserResponse {
    private String name;
    private String registrationNumber;
    private String address;
    private Boolean isverifiedByAdmin;
    private HospitalType type;
}
