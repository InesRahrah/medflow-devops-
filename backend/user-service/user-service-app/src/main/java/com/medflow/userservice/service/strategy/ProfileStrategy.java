package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;

public interface ProfileStrategy {
    void createProfile(User user, BaseUserRequest request);
    Role getRole();
}
