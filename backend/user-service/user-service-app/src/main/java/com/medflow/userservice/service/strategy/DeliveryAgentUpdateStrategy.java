package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.DeliveryAgentRequest;
import com.medflow.userservice.entity.DeliveryAgentProfile;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class DeliveryAgentUpdateStrategy implements UpdateProfileStrategy {

    @Override
    public void updateProfile(User user, BaseUserRequest request) {
        DeliveryAgentRequest req = (DeliveryAgentRequest) request;
        DeliveryAgentProfile profile = user.getDeliveryAgentProfile();

        if (profile == null) {
            profile = DeliveryAgentProfile.builder().user(user).build();
            user.setDeliveryAgentProfile(profile);
        }

        Optional.ofNullable(req.getDeliveryName()).ifPresent(profile::setDeliveryName);
        Optional.ofNullable(req.getVehicleType()).ifPresent(profile::setVehicleType);
    }

    @Override
    public Role getRole() {
        return Role.DELIVERY_AGENT;
    }
}
