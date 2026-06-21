package com.medflow.userservice.service;

import com.medflow.userservice.dto.*;
import com.medflow.userservice.entity.*;
import com.medflow.userservice.exception.ConflictException;
import com.medflow.userservice.repository.HospitalProfileRepository;
import com.medflow.userservice.repository.UserRepository;
import com.medflow.userservice.security.JwtService;
import com.medflow.userservice.service.integration.HospitalProvisioningClient;
import com.medflow.userservice.service.integration.dto.StaffJwtInfoResponse;
import com.medflow.userservice.service.strategy.ProfileStrategyFactory;
import com.medflow.userservice.service.validation.ValidationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private static final Logger log = LoggerFactory.getLogger(AuthenticationService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final ProfileStrategyFactory profileStrategyFactory;
    private final ValidationService validationService;
    private final com.medflow.userservice.security.GoogleTokenService googleTokenService;
    private final HospitalProvisioningClient hospitalProvisioningClient;
    private final HospitalProfileRepository hospitalProfileRepository;
    private final PatientAccessCodeService patientAccessCodeService;

    @Value("${application.security.face.threshold:0.5}")
    private double faceThreshold;

    @Transactional
    public AuthenticationResponse register(BaseUserRequest request) {
        validationService.validate(request);

        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ConflictException("An account with this email already exists.");
        }

        Role role = request.getRole() != null ? request.getRole() : Role.PATIENT;
        var user = User.builder()
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .role(role)
                .status(UserStatus.ACTIVE)
                .setupCompleted(true)
                .provider(AuthProvider.LOCAL)
                .verified(false)
                .build();

        profileStrategyFactory.getStrategy(role).createProfile(user, request);

        var savedUser = userRepository.save(user);
        patientAccessCodeService.ensureCodeExistsForPatient(savedUser);

        var jwtToken = generateTokenWithContext(savedUser);
        provisionHospitalForHospitalUser(savedUser, jwtToken);

        return AuthenticationResponse.builder()
                .token(jwtToken)
                .provider(savedUser.getProvider())
                .setupCompleted(savedUser.isSetupCompleted())
                .user(mapToUserProfileResponse(savedUser))
                .build();
    }

    @Transactional
    public AuthenticationResponse googleLogin(String token) {
        // In a real app, verify the token WITH Google API
        // Mock email extraction for demonstration / dev
        String email = extractEmailFromGoogleToken(token);

        var userOptional = userRepository.findByEmail(email);
        User user;
        if (userOptional.isPresent()) {
            user = userOptional.get();
        } else {
            // Create a new partial user (setup_completed = 0)
            user = User.builder()
                    .email(email)
                    .password(passwordEncoder.encode(java.util.UUID.randomUUID().toString()))
                    .provider(AuthProvider.GOOGLE)
                    .setupCompleted(false)
                    .role(Role.PATIENT) // Default role until setup
                    .status(UserStatus.ACTIVE)
                    .verified(true)
                    .build();
            user = userRepository.save(user);
        }

        user.setLastLoginAt(java.time.LocalDateTime.now());
        userRepository.save(user);

        var jwtToken = generateTokenWithContext(user);
        return AuthenticationResponse.builder()
                .token(jwtToken)
                .provider(user.getProvider())
                .setupCompleted(user.isSetupCompleted())
                .user(mapToUserProfileResponse(user))
                .build();
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()));
        var user = userRepository.findByEmail(request.getEmail())
                .orElseThrow();

        user.setLastLoginAt(java.time.LocalDateTime.now());
        userRepository.save(user);

        var jwtToken = generateTokenWithContext(user);
        return AuthenticationResponse.builder()
                .token(jwtToken)
                .provider(user.getProvider())
                .setupCompleted(user.isSetupCompleted())
                .user(mapToUserProfileResponse(user))
                .build();
    }

            @Transactional
            public FaceRegistrationResponse registerFace(FaceDescriptorRequest request) {
            String normalizedEmail = normalizeEmail(request.getEmail());
            validateDescriptor(request.getDescriptor());

            var user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

            ensureDoctorRole(user);

            user.setFaceDescriptor(serializeDescriptor(request.getDescriptor()));
            userRepository.save(user);

            return FaceRegistrationResponse.builder()
                .message("Face descriptor registered successfully")
                .email(normalizedEmail)
                .build();
            }

            public AuthenticationResponse authenticateFace(FaceDescriptorRequest request) {
            String normalizedEmail = normalizeEmail(request.getEmail());
            validateDescriptor(request.getDescriptor());

            var user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

            ensureDoctorRole(user);

            if (user.getFaceDescriptor() == null || user.getFaceDescriptor().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Face descriptor is not registered for this user");
            }

            List<Double> storedDescriptor = deserializeDescriptor(user.getFaceDescriptor());
            double distance = euclideanDistance(storedDescriptor, request.getDescriptor());

            if (distance >= faceThreshold) {
                throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Face does not match. Distance=" + String.format("%.4f", distance) + ", threshold=" + faceThreshold);
            }

            user.setLastLoginAt(java.time.LocalDateTime.now());
            userRepository.save(user);

            var jwtToken = generateTokenWithContext(user);
            return AuthenticationResponse.builder()
                .token(jwtToken)
                .provider(user.getProvider())
                .setupCompleted(user.isSetupCompleted())
                .user(mapToUserProfileResponse(user))
                .build();
            }

    @Transactional
    public AuthenticationResponse authenticateGoogle(String idTokenString) {
        try {
            com.google.api.client.googleapis.auth.oauth2.GoogleIdToken idToken = googleTokenService
                    .verify(idTokenString);
            com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload payload = idToken.getPayload();

            String email = payload.getEmail();
            String pictureUrl = (String) payload.get("picture");

            var user = userRepository.findByEmail(email).orElseGet(() -> {
                User newUser = User.builder()
                        .email(email)
                        .password(passwordEncoder.encode(java.util.UUID.randomUUID().toString()))
                        .role(null)
                        .status(UserStatus.ACTIVE)
                        .verified(true)
                        .provider(AuthProvider.GOOGLE)
                        .profilePictureUrl(pictureUrl)
                        .setupCompleted(false)
                        .build();

                return userRepository.save(newUser);
            });

            var jwtToken = generateTokenWithContext(user);
            return AuthenticationResponse.builder()
                    .token(jwtToken)
                    .provider(user.getProvider())
                    .setupCompleted(user.isSetupCompleted())
                    .user(mapToUserProfileResponse(user))
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("Google authentication failed", e);
        }
    }

    @Transactional
    public AuthenticationResponse setupGoogle(String email, SetupGoogleRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isSetupCompleted()) {
            throw new RuntimeException("Account setup is already completed");
        }

        user.setRole(request.getRole());
        user.setPhoneNumber(request.getPhoneNumber());

        BaseUserRequest mappedRequest = mapToRoleRequest(user.getEmail(), request);
        validationService.validate(mappedRequest);

        profileStrategyFactory.getStrategy(user.getRole()).createProfile(user, mappedRequest);

        user.setSetupCompleted(true);
        var savedUser = userRepository.save(user);
        patientAccessCodeService.ensureCodeExistsForPatient(savedUser);

        var jwtToken = generateTokenWithContext(savedUser);
        provisionHospitalForHospitalUser(savedUser, jwtToken);

        return AuthenticationResponse.builder()
                .token(jwtToken)
                .provider(savedUser.getProvider())
                .setupCompleted(true)
                .user(mapToUserProfileResponse(savedUser))
                .build();
    }

    private void provisionHospitalForHospitalUser(User user, String jwtToken) {
        if (Role.HOSPITAL.equals(user.getRole())) {
            String hospitalName = hospitalProfileRepository.findByUserId(user.getId())
                    .map(HospitalProfile::getName)
                    .orElse(null);
            hospitalProvisioningClient.createHospitalForUser(jwtToken, user.getId(), hospitalName);
        }
    }

    private String generateTokenWithContext(User user) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("email", user.getEmail());
        if (user.getRole() != null) {
            extraClaims.put("role", user.getRole().name());
        }

        // Try to get hospitalId from staff info (if staff record exists)
        UUID hospitalId = null;
        StaffJwtInfoResponse staffInfo = hospitalProvisioningClient.getStaffInfoByUserId(user.getId());
        if (staffInfo != null) {
            if (staffInfo.getRole() != null) {
                extraClaims.put("staffRole", staffInfo.getRole());
            }
            if (staffInfo.getHospitalId() != null) {
                hospitalId = staffInfo.getHospitalId();
            }
        }

        // Fallback: if no staff info, try to get hospitalId directly from
        // hospital-service
        if (hospitalId == null) {
            hospitalId = hospitalProvisioningClient.getHospitalIdByUserId(user.getId());
        }

        // Add hospitalId to JWT if available
        if (hospitalId != null) {
            extraClaims.put("hospitalId", hospitalId.toString());
        }

        return jwtService.generateToken(extraClaims, user);
    }

    private BaseUserRequest mapToRoleRequest(String email, SetupGoogleRequest request) {
        switch (request.getRole()) {
            case PATIENT:
                return PatientRequest.builder()
                        .email(email)
                        .role(Role.PATIENT)
                        .phoneNumber(request.getPhoneNumber())
                        .firstName(request.getFirstName())
                        .lastName(request.getLastName())
                        .dateOfBirth(request.getDateOfBirth())
                        .gender(request.getGender())
                        .bloodType(request.getBloodType())
                        .height(request.getHeight())
                        .weight(request.getWeight())
                        .build();
            case DOCTOR:
                return DoctorRequest.builder()
                        .email(email)
                        .role(Role.DOCTOR)
                        .phoneNumber(request.getPhoneNumber())
                        .firstName(request.getFirstName())
                        .lastName(request.getLastName())
                        .specialization(request.getSpecialization())
                        .licenseNumber(request.getLicenseNumber())
                        .build();
            case LABO:
                return LaboratoryRequest.builder()
                        .email(email)
                        .role(Role.LABO)
                        .phoneNumber(request.getPhoneNumber())
                        .labName(request.getLabName())
                        .registrationNumber(request.getRegistrationNumber())
                        .address(request.getAddress())
                        .supportedTests(request.getSupportedTests())
                        .build();
            case HOSPITAL:
                return HospitalRequest.builder()
                        .email(email)
                        .role(Role.HOSPITAL)
                        .phoneNumber(request.getPhoneNumber())
                        .name(request.getName())
                        .registrationNumber(request.getRegistrationNumber())
                        .hospitalType(request.getHospitalType() != null && !request.getHospitalType().isEmpty()
                                ? HospitalProfile.HospitalType.valueOf(request.getHospitalType().toUpperCase())
                                : null)
                        .build();
            case INSURANCE:
                return InsuranceRequest.builder()
                        .email(email)
                        .role(Role.INSURANCE)
                        .phoneNumber(request.getPhoneNumber())
                        .companyName(request.getCompanyName())
                        .registrationNumber(request.getRegistrationNumber())
                        .coverageTypes(request.getCoverageTypes())
                        .build();

            case CENTRAL_PHARMACY:
                return CentralPharmacyRequest.builder()
                        .email(email)
                        .role(Role.CENTRAL_PHARMACY)
                        .phoneNumber(request.getPhoneNumber())
                        .build();
            case PHARMACIST:
                return PharmacistRequest.builder()
                        .email(email)
                        .role(Role.PHARMACIST)
                        .phoneNumber(request.getPhoneNumber())
                        .pharmacyName(request.getPharmacyName())
                        .licenseNumber(request.getLicenseNumber())
                        .region(request.getRegion())
                        .build();
            case DELIVERY_AGENT:
                return DeliveryAgentRequest.builder()
                        .email(email)
                        .role(Role.DELIVERY_AGENT)
                        .phoneNumber(request.getPhoneNumber())
                        .deliveryName(request.getDeliveryName())
                        .vehicleType(request.getVehicleType())
                        .build();
            default:
                throw new RuntimeException("Unsupported role for Google setup");
        }
    }

    private UserProfileResponse mapToUserProfileResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .provider(user.getProvider())
                .setupCompleted(user.isSetupCompleted())
                .build();
    }

    private String extractEmailFromGoogleToken(String token) {
        if (token != null && token.contains("@")) {
            return token.toLowerCase().trim();
        }

        try {
            if (token != null && token.contains(".")) {
                String[] parts = token.split("\\.");
                if (parts.length >= 2) {
                    String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));

                    // Use regex to find "email":"..."
                    java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\"email\"\\s*:\\s*\"([^\"]+)\"");
                    java.util.regex.Matcher matcher = pattern.matcher(payload);
                    if (matcher.find()) {
                        return matcher.group(1).toLowerCase().trim();
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to extract email from token: " + e.getMessage());
        }

        return "google_user_" + java.util.UUID.randomUUID().toString().substring(0, 8) + "@example.com";
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        return email.trim().toLowerCase();
    }

    private void ensureDoctorRole(User user) {
        if (!Role.DOCTOR.equals(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Face recognition is available for doctors only");
        }
    }

    private void validateDescriptor(List<Double> descriptor) {
        if (descriptor == null || descriptor.size() != 128) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Descriptor must contain 128 numeric values");
        }

        for (Double value : descriptor) {
            if (value == null || !Double.isFinite(value)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Descriptor contains invalid numeric values");
            }
        }
    }

    private String serializeDescriptor(List<Double> descriptor) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < descriptor.size(); i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(descriptor.get(i));
        }
        return sb.toString();
    }

    private List<Double> deserializeDescriptor(String serialized) {
        String[] parts = serialized.split(",");
        if (parts.length != 128) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stored face descriptor has invalid size");
        }

        java.util.ArrayList<Double> result = new java.util.ArrayList<>(128);
        try {
            for (String part : parts) {
                result.add(Double.parseDouble(part));
            }
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stored face descriptor is corrupted");
        }
        return result;
    }

    private double euclideanDistance(List<Double> first, List<Double> second) {
        double sum = 0.0;
        for (int i = 0; i < first.size(); i++) {
            double diff = first.get(i) - second.get(i);
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }
}
