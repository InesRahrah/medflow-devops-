package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.LaboratoryRequest;
import com.medflow.userservice.entity.LaboratoryProfile;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.stereotype.Component;

@Component
public class LaboratoryProfileStrategy implements ProfileStrategy {
    @Override
    public void createProfile(User user, BaseUserRequest request) {
        LaboratoryRequest labRequest = (LaboratoryRequest) request;
        var profile = LaboratoryProfile.builder()
                .user(user)
                .labName(labRequest.getLabName())
                .registrationNumber(labRequest.getRegistrationNumber())
                .address(labRequest.getAddress())
                .accreditation(labRequest.getAccreditation())
                .openingHours(labRequest.getOpeningHours())
                .supportedTests(labRequest.getSupportedTests())
                .isverifiedByAdmin(false)
                .build();
        user.setLaboratoryProfile(profile);
    }

    @Override
    public Role getRole() {
        return Role.LABO;
    }
}
