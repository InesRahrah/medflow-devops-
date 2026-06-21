package com.medflow.userservice.service.validation;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.DeliveryAgentRequest;
import com.medflow.userservice.entity.Role;
import org.springframework.stereotype.Component;

@Component
public class DeliveryAgentValidator implements RegistrationValidator {

    @Override
    public void validate(BaseUserRequest request) {
        DeliveryAgentRequest req = (DeliveryAgentRequest) request;

        if (req.getVehicleType() == null) {
            throw new IllegalArgumentException("VehicleType is required for delivery agent");
        }
    }

    @Override
    public Role getRole() {
        return Role.DELIVERY_AGENT;
    }
}
