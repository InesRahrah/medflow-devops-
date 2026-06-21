package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.DeliveryAgentRequest;
import com.medflow.userservice.entity.DeliveryAgentProfile;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.stereotype.Component;

@Component
public class DeliveryAgentProfileStrategy implements ProfileStrategy {

    @Override
    public void createProfile(User user, BaseUserRequest request) {
        DeliveryAgentRequest req = (DeliveryAgentRequest) request;

        var profile = DeliveryAgentProfile.builder()
                .user(user)
                .deliveryName(req.getDeliveryName())
                .vehicleType(req.getVehicleType())
                .build();

        user.setDeliveryAgentProfile(profile);
    }

    @Override
    public Role getRole() {
        return Role.DELIVERY_AGENT;
    }
}
