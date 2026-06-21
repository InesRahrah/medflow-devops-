package com.medflow.hospitalservice.service.integration;

import com.medflow.hospitalservice.dto.integration.CreateStaffUserRequest;
import com.medflow.hospitalservice.dto.integration.CreateStaffUserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class UserProvisioningClient {

    private final RestTemplate restTemplate;

    @Value("${user.service.base-url:http://localhost:8080}")
    private String userServiceBaseUrl;

    private String resolvedUserServiceBaseUrl() {
        if (userServiceBaseUrl == null || userServiceBaseUrl.isBlank()) {
            return "http://localhost:8080";
        }

        String normalized = userServiceBaseUrl.trim();
        if (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }

        if (normalized.contains("localhost:8081")) {
            normalized = normalized.replace("localhost:8081", "localhost:8080");
        }

        return normalized;
    }

    public CreateStaffUserResponse createStaffAccount(String authorizationHeader, CreateStaffUserRequest request) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (authorizationHeader != null && !authorizationHeader.isBlank()) {
            headers.set(HttpHeaders.AUTHORIZATION, authorizationHeader);
        }

        HttpEntity<CreateStaffUserRequest> entity = new HttpEntity<>(request, headers);
        ResponseEntity<CreateStaffUserResponse> response = restTemplate.exchange(
                resolvedUserServiceBaseUrl() + "/api/v1/users/internal/staff-account",
                HttpMethod.POST,
                entity,
                CreateStaffUserResponse.class);

        return response.getBody();
    }

    public void deleteUser(String authorizationHeader, UUID userId) {
        HttpHeaders headers = new HttpHeaders();
        if (authorizationHeader != null && !authorizationHeader.isBlank()) {
            headers.set(HttpHeaders.AUTHORIZATION, authorizationHeader);
        }

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        restTemplate.exchange(
                resolvedUserServiceBaseUrl() + "/api/v1/users/internal/" + userId,
                HttpMethod.DELETE,
                entity,
                Void.class);
    }

    public void deleteUser(UUID userId) {
        deleteUser(null, userId);
    }

    public com.medflow.hospitalservice.dto.integration.UserInfoResponse getUserInfo(UUID userId) {
        try {
            ResponseEntity<com.medflow.hospitalservice.dto.integration.UserInfoResponse> response = restTemplate
                    .exchange(
                            resolvedUserServiceBaseUrl() + "/api/v1/users/internal/info/" + userId,
                            HttpMethod.GET,
                            HttpEntity.EMPTY,
                            com.medflow.hospitalservice.dto.integration.UserInfoResponse.class);
            return response.getBody();
        } catch (Exception e) {
            return null;
        }
    }

    public void updateUserEmail(UUID userId, String email) {
        if (userId == null || email == null || email.isBlank()) {
            return;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, String>> entity = new HttpEntity<>(
                Map.of("email", email.trim().toLowerCase()),
                headers);

        restTemplate.exchange(
                resolvedUserServiceBaseUrl() + "/api/v1/users/internal/" + userId + "/email",
                HttpMethod.PUT,
                entity,
                Void.class);
    }
}
