package com.medflow.userservice.dto;
 
import com.medflow.userservice.entity.AuthProvider;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthenticationResponse {
    private String token;
    private UserProfileResponse user;
    private AuthProvider provider;
    private boolean setupCompleted;
}
