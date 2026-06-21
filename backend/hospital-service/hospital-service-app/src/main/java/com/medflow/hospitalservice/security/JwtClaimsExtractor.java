package com.medflow.hospitalservice.security;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtClaimsExtractor {

    private final JwtUtil jwtUtil;

    private static final String HOSPITAL_ROLE = "HOSPITAL";

    public UUID getHospitalId() {
        String token = getTokenFromRequest();
        return extractHospitalId(token);
    }

    public UUID getRequiredHospitalId() {
        UUID hospitalId = getHospitalId();
        if (hospitalId == null) {
            throw new SecurityException("HospitalId not found in token. Access denied.");
        }
        return hospitalId;
    }

    public UUID extractHospitalId(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }

        UUID claimHospitalId = parseUuid(jwtUtil.extractClaim(token, claims -> (String) claims.get("hospitalId")));
        if (claimHospitalId != null) {
            return claimHospitalId;
        }

        // Backward compatibility fallback:
        // Some legacy HOSPITAL tokens used sub for tenant context.
        String role = jwtUtil.extractRole(token);
        if (HOSPITAL_ROLE.equalsIgnoreCase(role)) {
            return parseUuid(jwtUtil.extractUserId(token));
        }

        return null;
    }

    public UUID getUserId() {
        String token = getTokenFromRequest();
        if (token == null) {
            return null;
        }

        String subject = jwtUtil.extractUserId(token);
        if (subject == null || subject.isBlank()) {
            return null;
        }

        try {
            return UUID.fromString(subject);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public String getStaffRole() {
        String token = getTokenFromRequest();
        if (token == null) {
            return null;
        }
        return jwtUtil.extractClaim(token, claims -> (String) claims.get("staffRole"));
    }

    public String getSystemRole() {
        String token = getTokenFromRequest();
        if (token == null) {
            return null;
        }
        return jwtUtil.extractRole(token);
    }

    public String getEmail() {
        String token = getTokenFromRequest();
        if (token == null) {
            return null;
        }
        return jwtUtil.extractClaim(token, claims -> (String) claims.get("email"));
    }

    public void validateHospitalId(UUID hospitalId) {
        UUID jwtHospitalId = getHospitalId();
        if (jwtHospitalId == null || !jwtHospitalId.equals(hospitalId)) {
            throw new SecurityException("Hospital ID mismatch or not found in token. Access denied.");
        }
    }

    public boolean hasStaffRole(String role) {
        String userRole = getStaffRole();
        return userRole != null && userRole.equals(role);
    }

    public boolean hasSystemRole(String role) {
        String userRole = getSystemRole();
        return userRole != null && userRole.equals(role);
    }

    private UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String getTokenFromRequest() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) {
                return null;
            }

            HttpServletRequest request = attrs.getRequest();
            String authHeader = request.getHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                return authHeader.substring(7);
            }
        } catch (IllegalStateException e) {
            return null;
        }

        return null;
    }
}
