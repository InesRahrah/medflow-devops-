package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;

public interface UpdateProfileStrategy {
    void updateProfile(User user, BaseUserRequest request);
    Role getRole();
}
