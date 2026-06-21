package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.HospitalRequest;
import com.medflow.userservice.entity.HospitalProfile;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class HospitalUpdateStrategy implements UpdateProfileStrategy {
    @Override
    public void updateProfile(User user, BaseUserRequest request) {
        HospitalRequest hospitalRequest = (HospitalRequest) request;
        HospitalProfile profile = user.getHospitalProfile();

        if (profile == null) {
            profile = HospitalProfile.builder().user(user).build();
            user.setHospitalProfile(profile);
        }

        Optional.ofNullable(hospitalRequest.getName()).ifPresent(profile::setName);
        Optional.ofNullable(hospitalRequest.getRegistrationNumber()).ifPresent(profile::setRegistrationNumber);
        Optional.ofNullable(hospitalRequest.getAddress()).ifPresent(profile::setAddress);
        Optional.ofNullable(hospitalRequest.getHospitalType()).ifPresent(profile::setType);
    }

    @Override
    public Role getRole() {
        return Role.HOSPITAL;
    }
}
