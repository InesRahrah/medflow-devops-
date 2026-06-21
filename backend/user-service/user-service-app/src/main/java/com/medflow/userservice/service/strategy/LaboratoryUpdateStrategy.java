package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.LaboratoryRequest;
import com.medflow.userservice.entity.LaboratoryProfile;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class LaboratoryUpdateStrategy implements UpdateProfileStrategy {
    @Override
    public void updateProfile(User user, BaseUserRequest request) {
        LaboratoryRequest labRequest = (LaboratoryRequest) request;
        LaboratoryProfile profile = user.getLaboratoryProfile();

        if (profile == null) {
            profile = LaboratoryProfile.builder().user(user).build();
            user.setLaboratoryProfile(profile);
        }

        Optional.ofNullable(labRequest.getLabName()).ifPresent(profile::setLabName);
        Optional.ofNullable(labRequest.getRegistrationNumber()).ifPresent(profile::setRegistrationNumber);
        Optional.ofNullable(labRequest.getAddress()).ifPresent(profile::setAddress);
        Optional.ofNullable(labRequest.getAccreditation()).ifPresent(profile::setAccreditation);
        Optional.ofNullable(labRequest.getOpeningHours()).ifPresent(profile::setOpeningHours);
        Optional.ofNullable(labRequest.getSupportedTests()).ifPresent(profile::setSupportedTests);
    }

    @Override
    public Role getRole() {
        return Role.LABO;
    }
}
