package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.HospitalRequest;
import com.medflow.userservice.entity.HospitalProfile;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.stereotype.Component;

@Component
public class HospitalProfileStrategy implements ProfileStrategy {
    @Override
    public void createProfile(User user, BaseUserRequest request) {
        HospitalRequest hospitalRequest = (HospitalRequest) request;
        var profile = HospitalProfile.builder()
                .user(user)
                .name(hospitalRequest.getName())
                .registrationNumber(hospitalRequest.getRegistrationNumber())
                .address(hospitalRequest.getAddress())
                .type(hospitalRequest.getHospitalType())
                .isverifiedByAdmin(false)
                .build();
        user.setHospitalProfile(profile);
    }

    @Override
    public Role getRole() {
        return Role.HOSPITAL;
    }
}
