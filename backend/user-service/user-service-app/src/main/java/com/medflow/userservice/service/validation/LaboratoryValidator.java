package com.medflow.userservice.service.validation;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.LaboratoryRequest;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.exception.ConflictException;
import com.medflow.userservice.repository.LaboratoryProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class LaboratoryValidator implements RegistrationValidator {

    private final LaboratoryProfileRepository laboratoryProfileRepository;

    @Override
    public void validate(BaseUserRequest request) {
        LaboratoryRequest labRequest = (LaboratoryRequest) request;
        if (labRequest.getLabName() == null || labRequest.getLabName().isBlank()) {
            throw new IllegalArgumentException("Lab name is required for laboratories");
        }
        if (labRequest.getRegistrationNumber() == null || labRequest.getRegistrationNumber().isBlank()) {
            throw new IllegalArgumentException("Registration number is required for laboratories");
        }

        String registrationNumber = labRequest.getRegistrationNumber().trim();
        if (laboratoryProfileRepository.existsByRegistrationNumber(registrationNumber)) {
            throw new ConflictException("Laboratory registration number already exists.");
        }
    }

    @Override
    public Role getRole() {
        return Role.LABO;
    }
}
