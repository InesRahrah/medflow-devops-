package com.medflow.userservice.dto;

import com.medflow.userservice.entity.Region;
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
public class PharmacistUserResponse extends BaseUserResponse {

    private String pharmacyName;
    private String licenseNumber;
    private Region region;
}
