package com.medflow.userservice.service.integration;

import com.medflow.userservice.service.integration.dto.HospitalProvisionRequest;
import com.medflow.userservice.service.integration.dto.StaffJwtInfoResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class HospitalProvisioningClient {

    private final RestTemplate restTemplate;

    @Value("${hospital.service.base-url:http://localhost:8085}")
    private String hospitalServiceBaseUrl;

    public void createHospitalForUser(String jwtToken, UUID userId, String hospitalName) {
        String url = hospitalServiceBaseUrl + "/api/hospitals/me";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtToken);

        HospitalProvisionRequest payload = HospitalProvisionRequest.builder()
                .userId(userId)
                .name(hospitalName)
                .build();

        try {
            restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(payload, headers), Void.class);
            log.info("Hospital provisioned for userId={}", userId);
        } catch (RestClientException ex) {
            log.warn("Hospital provisioning failed for userId={}. User registration remains successful. Cause={}",
                    userId, ex.getMessage());
            log.debug("Hospital provisioning stack trace for userId={}", userId, ex);
        }
    }

    public StaffJwtInfoResponse getStaffInfoByUserId(UUID userId) {
        String url = hospitalServiceBaseUrl + "/api/staff/internal/by-user/" + userId;

        try {
            ResponseEntity<StaffJwtInfoResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    HttpEntity.EMPTY,
                    StaffJwtInfoResponse.class);
            return response.getBody();
        } catch (HttpClientErrorException.NotFound ex) {
            return null;
        } catch (RestClientException ex) {
            log.debug("Unable to fetch staff info for userId={}: {}", userId, ex.getMessage());
            return null;
        }
    }

    public UUID getHospitalIdByUserId(UUID userId) {
        String url = hospitalServiceBaseUrl + "/api/hospitals/internal/by-user/" + userId;

        try {
            ResponseEntity<UUID> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    HttpEntity.EMPTY,
                    UUID.class);
            return response.getBody();
        } catch (HttpClientErrorException.NotFound ex) {
            return null;
        } catch (RestClientException ex) {
            log.debug("Unable to fetch hospital ID for userId={}: {}", userId, ex.getMessage());
            return null;
        }
    }
}
