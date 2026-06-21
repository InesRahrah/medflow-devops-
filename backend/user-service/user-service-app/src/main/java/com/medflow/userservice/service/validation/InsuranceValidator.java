package com.medflow.userservice.service.validation;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.InsuranceRequest;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.exception.ConflictException;
import com.medflow.userservice.repository.InsuranceProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class InsuranceValidator implements RegistrationValidator {

    private final InsuranceProfileRepository insuranceProfileRepository;

    @Override
    public void validate(BaseUserRequest request) {
        InsuranceRequest insuranceRequest = (InsuranceRequest) request;
        if (insuranceRequest.getCompanyName() == null || insuranceRequest.getCompanyName().isBlank()) {
            throw new IllegalArgumentException("Company name is required for insurance providers");
        }
        if (insuranceRequest.getRegistrationNumber() == null || insuranceRequest.getRegistrationNumber().isBlank()) {
            throw new IllegalArgumentException("Registration number is required for insurance providers");
        }

        String registrationNumber = insuranceRequest.getRegistrationNumber().trim();
        if (insuranceProfileRepository.existsByRegistrationNumber(registrationNumber)) {
            throw new ConflictException("Insurance registration number already exists.");
        }
    }

    @Override
    public Role getRole() {
        return Role.INSURANCE;
    }
}
