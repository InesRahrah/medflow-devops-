package com.medflow.dmrservice.client;

import com.medflow.dmrservice.dto.UserServiceValidateAccessCodeRequest;
import com.medflow.dmrservice.dto.UserServiceValidateAccessCodeResponse;
import com.medflow.dmrservice.dto.UserProfileLookupResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UserServiceClient {

    private final RestTemplate restTemplate;

    @Value("${integration.user-service.base-url:http://localhost:8080}")
    private String userServiceBaseUrl;

    public UserServiceValidateAccessCodeResponse validateAccessCode(String code) {
        String url = userServiceBaseUrl + "/api/v1/internal/access-codes/validate";
        UserServiceValidateAccessCodeRequest request = UserServiceValidateAccessCodeRequest.builder()
                .code(code)
                .build();

        ResponseEntity<UserServiceValidateAccessCodeResponse> response = restTemplate.postForEntity(
                url,
                request,
                UserServiceValidateAccessCodeResponse.class
        );

        return response.getBody();
    }

    public UserProfileLookupResponse getInternalUserById(UUID userId) {
        String url = userServiceBaseUrl + "/api/v1/internal/users/" + userId;
        ResponseEntity<UserProfileLookupResponse> response = restTemplate.getForEntity(url, UserProfileLookupResponse.class);
        return response.getBody();
    }

    public List<UserProfileLookupResponse> getInternalLaboratories() {
        String url = userServiceBaseUrl + "/api/v1/internal/laboratories";
        ResponseEntity<List<UserProfileLookupResponse>> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {
                }
        );

        List<UserProfileLookupResponse> body = response.getBody();
        if (body == null) {
            return Collections.emptyList();
        }
        return body;
    }

    public UserProfileLookupResponse getInternalLaboratoryById(UUID laboId) {
        UserProfileLookupResponse profile = getInternalUserById(laboId);
        if (profile == null || profile.getRole() == null || !"LABO".equalsIgnoreCase(profile.getRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected user is not a laboratory");
        }
        return profile;
    }
}
