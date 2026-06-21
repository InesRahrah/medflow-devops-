package com.medflow.userservice.service.validation;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.PatientRequest;
import com.medflow.userservice.entity.Role;
import org.springframework.stereotype.Component;

@Component
public class PatientValidator implements RegistrationValidator {
    @Override
    public void validate(BaseUserRequest request) {
        PatientRequest patientRequest = (PatientRequest) request;
        if (patientRequest.getDateOfBirth() == null) {
            throw new IllegalArgumentException("Date of birth is required for patients");
        }
    }

    @Override
    public Role getRole() {
        return Role.PATIENT;
    }
}
