package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.InsuranceRequest;
import com.medflow.userservice.entity.InsuranceProfile;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class InsuranceUpdateStrategy implements UpdateProfileStrategy {
    @Override
    public void updateProfile(User user, BaseUserRequest request) {
        InsuranceRequest insuranceRequest = (InsuranceRequest) request;
        InsuranceProfile profile = user.getInsuranceProfile();

        if (profile == null) {
            profile = InsuranceProfile.builder().user(user).build();
            user.setInsuranceProfile(profile);
        }

        Optional.ofNullable(insuranceRequest.getCompanyName()).ifPresent(profile::setCompanyName);
        Optional.ofNullable(insuranceRequest.getRegistrationNumber()).ifPresent(profile::setRegistrationNumber);
        Optional.ofNullable(insuranceRequest.getAddress()).ifPresent(profile::setAddress);
        Optional.ofNullable(insuranceRequest.getCoverageTypes()).ifPresent(profile::setCoverageTypes);
        Optional.ofNullable(insuranceRequest.getClaimProcessDescription()).ifPresent(profile::setClaimProcessDescription);
    }

    @Override
    public Role getRole() {
        return Role.INSURANCE;
    }
}

