package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.InsuranceRequest;
import com.medflow.userservice.entity.InsuranceProfile;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.stereotype.Component;

@Component
public class InsuranceProfileStrategy implements ProfileStrategy {
    @Override
    public void createProfile(User user, BaseUserRequest request) {
        InsuranceRequest insuranceRequest = (InsuranceRequest) request;
        var profile = InsuranceProfile.builder()
                .user(user)
                .companyName(insuranceRequest.getCompanyName())
                .registrationNumber(insuranceRequest.getRegistrationNumber())
                .address(insuranceRequest.getAddress())
                .coverageTypes(insuranceRequest.getCoverageTypes())
                .claimProcessDescription(insuranceRequest.getClaimProcessDescription())
                .build();
        user.setInsuranceProfile(profile);
    }

    @Override
    public Role getRole() {
        return Role.INSURANCE;
    }
}

