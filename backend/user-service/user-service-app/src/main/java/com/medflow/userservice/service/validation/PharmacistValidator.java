package com.medflow.userservice.service.validation;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.PharmacistRequest;
import com.medflow.userservice.entity.Role;
import org.springframework.stereotype.Component;

@Component
public class PharmacistValidator implements RegistrationValidator {

    @Override
    public void validate(BaseUserRequest request) {
        PharmacistRequest req = (PharmacistRequest) request;

        if (req.getLicenseNumber() == null) {
            throw new IllegalArgumentException("License number is required for pharmacist");
        }

        if (req.getRegion() == null) {
            throw new IllegalArgumentException("Region is required for pharmacist");
        }
    }

    @Override
    public Role getRole() {
        return Role.PHARMACIST;
    }
}
