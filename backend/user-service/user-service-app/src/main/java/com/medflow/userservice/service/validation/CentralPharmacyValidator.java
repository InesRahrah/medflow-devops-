package com.medflow.userservice.service.validation;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.entity.Role;
import org.springframework.stereotype.Component;

@Component
public class CentralPharmacyValidator implements RegistrationValidator {

    @Override
    public void validate(BaseUserRequest request) {
        // rien à valider
    }

    @Override
    public Role getRole() {
        return Role.CENTRAL_PHARMACY;
    }
}
