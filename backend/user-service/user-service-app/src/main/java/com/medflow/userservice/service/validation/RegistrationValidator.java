package com.medflow.userservice.service.validation;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.entity.Role;

public interface RegistrationValidator {
    void validate(BaseUserRequest request);
    Role getRole();
}
