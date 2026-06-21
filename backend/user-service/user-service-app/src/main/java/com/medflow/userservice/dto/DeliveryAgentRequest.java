package com.medflow.userservice.dto;

import jakarta.validation.constraints.NotBlank;
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
public class DeliveryAgentRequest extends BaseUserRequest {

    @NotBlank(message = "deliveryName is required")
    private String deliveryName;

    @NotBlank(message = "vehicleType is required")
    private String vehicleType;
}
