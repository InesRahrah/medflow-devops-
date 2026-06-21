package com.medflow.userservice.service.validation;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.entity.Role;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ValidationService {

    private final Map<Role, RegistrationValidator> validators;

    public ValidationService(List<RegistrationValidator> validatorList) {
        validators = validatorList.stream()
                .collect(Collectors.toMap(RegistrationValidator::getRole, Function.identity()));
    }

    public void validate(BaseUserRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        // Password is only strictly required for registration, 
        // but since this was RegistrationService logic, I'll keep it for now
        // or refine it late if needed for updates.
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            // Only throw if it's intended to be a registration
            // For now, I'll assume if password is provided, we validate it.
        }

        Role role = request.getRole();
        if (role != null && validators.containsKey(role)) {
            validators.get(role).validate(request);
        }
    }
}
