package com.medflow.appointmentservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
public class UserProfileLookupService {

    public static class UserProfile {
        private final String rawId;
        private final UUID id;
        private final Long numericId;
        private final String role;
        private final String displayName;
        private final String specialization;
        private final String email;

        public UserProfile(String rawId, UUID id, Long numericId, String role, String displayName, String specialization, String email) {
            this.rawId = rawId;
            this.id = id;
            this.numericId = numericId;
            this.role = role;
            this.displayName = displayName;
            this.specialization = specialization;
            this.email = email;
        }

        public String getRawId() {
            return rawId;
        }

        public UUID getId() {
            return id;
        }

        public Long getNumericId() {
            return numericId;
        }

        public String getRole() {
            return role;
        }

        public String getDisplayName() {
            return displayName;
        }

        public String getSpecialization() {
            return specialization;
        }

        public String getEmail() {
            return email;
        }
    }

    private final RestTemplate restTemplate;
    private final String userServiceBaseUrl;

    public UserProfileLookupService(RestTemplateBuilder restTemplateBuilder,
                                    @Value("${user.service.base-url:http://localhost:8080}") String userServiceBaseUrl) {
        this.restTemplate = restTemplateBuilder.build();
        this.userServiceBaseUrl = userServiceBaseUrl;
    }

    public String getDisplayName(UUID userId) {
        return getProfile(userId).getDisplayName();
    }

    public String getDoctorSchedule(UUID userId) {
        if (userId == null) {
            return null;
        }

        try {
            JsonNode body = restTemplate.getForObject(userServiceBaseUrl + "/api/v1/users/" + userId, JsonNode.class);
            return textValue(body, "availabilitySchedule");
        } catch (Exception ignored) {
            return null;
        }
    }

    public JsonNode getDoctorProfile(UUID doctorId) {
        if (doctorId == null) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Doctor ID is required");
        }

        try {
            JsonNode body = restTemplate.getForObject(userServiceBaseUrl + "/api/v1/users/doctors/" + doctorId, JsonNode.class);
            if (body == null || body.isNull()) {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Doctor profile not found");
            }
            return body;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_GATEWAY,
                    "Unable to fetch doctor profile");
        }
    }

    public UserProfile getCurrentUserProfile(String authorizationHeader, String userIdHeader) {
        if (authorizationHeader != null && !authorizationHeader.isBlank()) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.set(HttpHeaders.AUTHORIZATION, authorizationHeader);
                ResponseEntity<JsonNode> response = restTemplate.exchange(
                        userServiceBaseUrl + "/api/v1/users/me",
                        HttpMethod.GET,
                        new HttpEntity<>(headers),
                        JsonNode.class
                );

                JsonNode body = response.getBody();
                if (body != null && !body.isNull()) {
                    String rawId = textValue(body, "id");
                    return new UserProfile(
                        rawId,
                        parseUuid(rawId),
                        parseLong(rawId),
                            textValue(body, "role"),
                            extractDisplayName(body),
                            textValue(body, "specialization"),
                            textValue(body, "email")
                    );
                }
            } catch (Exception ignored) {
                // Fall through to X-User-Id fallback.
            }
        }

        UUID fallbackId = parseUuid(userIdHeader);
        if (fallbackId != null) {
            return getProfile(fallbackId);
        }
        return null;
    }

    public UserProfile getProfile(UUID userId) {
        if (userId == null) {
            return new UserProfile(null, null, null, null, null, null, null);
        }

        try {
            JsonNode body = restTemplate.getForObject(userServiceBaseUrl + "/api/v1/users/" + userId, JsonNode.class);
            if (body == null || body.isNull()) {
                return new UserProfile(userId.toString(), userId, null, null, null, null, null);
            }

            String rawId = textValue(body, "id");
            if (rawId == null) {
                rawId = userId.toString();
            }

            return new UserProfile(
                    rawId,
                    parseUuid(rawId) == null ? userId : parseUuid(rawId),
                    parseLong(rawId),
                    textValue(body, "role"),
                    extractDisplayName(body),
                    textValue(body, "specialization"),
                    textValue(body, "email")
            );
        } catch (Exception ignored) {
            return new UserProfile(userId.toString(), userId, null, null, null, null, null);
        }
    }

    private String extractDisplayName(JsonNode body) {
        if (body == null || body.isNull()) {
            return null;
        }

        String firstName = textValue(body, "firstName");
        String lastName = textValue(body, "lastName");
        String fullName = joinNames(firstName, lastName);
        if (fullName != null) {
            return fullName;
        }

        String[] fallbackFields = {"name", "companyName", "labName", "email"};
        for (String field : fallbackFields) {
            String value = textValue(body, field);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }

        return null;
    }

    private String textValue(JsonNode body, String field) {
        JsonNode node = body.get(field);
        if (node == null || node.isNull()) {
            return null;
        }
        String value = node.asText();
        return value == null || value.isBlank() ? null : value;
    }

    private String joinNames(String firstName, String lastName) {
        if ((firstName == null || firstName.isBlank()) && (lastName == null || lastName.isBlank())) {
            return null;
        }
        if (firstName == null || firstName.isBlank()) {
            return lastName;
        }
        if (lastName == null || lastName.isBlank()) {
            return firstName;
        }
        return firstName + " " + lastName;
    }

    private UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}