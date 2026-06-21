package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.PharmacistRequest;
import com.medflow.userservice.entity.PharmacistProfile;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class PharmacistUpdateStrategy implements UpdateProfileStrategy {

    @Override
    public void updateProfile(User user, BaseUserRequest request) {
        PharmacistRequest req = (PharmacistRequest) request;
        PharmacistProfile profile = user.getPharmacistProfile();

        if (profile == null) {
            profile = PharmacistProfile.builder().user(user).build();
            user.setPharmacistProfile(profile);
        }

        Optional.ofNullable(req.getPharmacyName()).ifPresent(profile::setPharmacyName);
        Optional.ofNullable(req.getLicenseNumber()).ifPresent(profile::setLicenseNumber);
        Optional.ofNullable(req.getRegion()).ifPresent(profile::setRegion);
    }

    @Override
    public Role getRole() {
        return Role.PHARMACIST;
    }
}
