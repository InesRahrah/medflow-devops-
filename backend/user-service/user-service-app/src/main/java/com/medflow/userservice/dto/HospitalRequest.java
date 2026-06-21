package com.medflow.userservice.dto;

import com.medflow.userservice.entity.HospitalProfile;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@ToString(callSuper = true)
public class HospitalRequest extends BaseUserRequest {
    @NotBlank(message = "Hospital name is required", groups = { OnCreate.class, OnUpdate.class })
    private String name;

    @NotBlank(message = "Registration number is required", groups = { OnCreate.class, OnUpdate.class })
    private String registrationNumber;

    private String address;
    @NotNull(message = "Hospital type is required", groups = { OnCreate.class, OnUpdate.class })
    private HospitalProfile.HospitalType hospitalType;
}
