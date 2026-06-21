package com.medflow.userservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.ALWAYS)
public class InsuranceUserResponse extends BaseUserResponse {
    private String companyName;
    private String registrationNumber;
    private String address;    
    private List<String> coverageTypes;
    private String claimProcessDescription;
}

