package com.medflow.userservice.service.validation;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.HospitalRequest;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.exception.ConflictException;
import com.medflow.userservice.repository.HospitalProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class HospitalValidator implements RegistrationValidator {

    private final HospitalProfileRepository hospitalProfileRepository;

    @Override
    public void validate(BaseUserRequest request) {
        HospitalRequest hospitalRequest = (HospitalRequest) request;
        if (hospitalRequest.getRegistrationNumber() == null || hospitalRequest.getRegistrationNumber().isBlank()) {
            throw new IllegalArgumentException("Registration number is required for hospitals");
        }
        if (hospitalRequest.getName() == null || hospitalRequest.getName().isBlank()) {
            throw new IllegalArgumentException("Hospital name is required");
        }

        String registrationNumber = hospitalRequest.getRegistrationNumber().trim();
        if (hospitalProfileRepository.existsByRegistrationNumber(registrationNumber)) {
            throw new ConflictException("Hospital registration number already exists.");
        }
    }

    @Override
    public Role getRole() {
        return Role.HOSPITAL;
    }
}
