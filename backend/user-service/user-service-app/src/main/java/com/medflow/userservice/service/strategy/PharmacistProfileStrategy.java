package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.PharmacistRequest;
import com.medflow.userservice.entity.PharmacistProfile;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.stereotype.Component;

@Component
public class PharmacistProfileStrategy implements ProfileStrategy {

    @Override
    public void createProfile(User user, BaseUserRequest request) {
        PharmacistRequest req = (PharmacistRequest) request;

        var profile = PharmacistProfile.builder()
                .user(user)
                .pharmacyName(req.getPharmacyName())
                .licenseNumber(req.getLicenseNumber())
                .region(req.getRegion())
                .build();

        user.setPharmacistProfile(profile);
    }

    @Override
    public Role getRole() {
        return Role.PHARMACIST;
    }
}
