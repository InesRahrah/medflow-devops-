package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.entity.CentralPharmacyProfile;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.stereotype.Component;

@Component
public class CentralPharmacyProfileStrategy implements ProfileStrategy {

    @Override
    public void createProfile(User user, BaseUserRequest request) {

        CentralPharmacyProfile profile = CentralPharmacyProfile.builder()
                .user(user)
                .build();

        user.setCentralPharmacyProfile(profile);
    }

    @Override
    public Role getRole() {
        return Role.CENTRAL_PHARMACY;
    }
}
