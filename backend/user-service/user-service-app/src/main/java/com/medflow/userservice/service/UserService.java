
    package com.medflow.userservice.service;

import com.medflow.userservice.dto.*;
import com.medflow.userservice.entity.*;
import com.medflow.userservice.repository.UserRepository;
import com.medflow.userservice.service.strategy.UpdateProfileStrategyFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.security.SecureRandom;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UpdateProfileStrategyFactory updateProfileStrategyFactory;
    private final FileStorageService fileStorageService;
    private final PasswordEncoder passwordEncoder;

    private static final String STAFF_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";
    private static final int GENERATED_PASSWORD_LENGTH = 12;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public List<String> getAllUniqueSpecializations() {
        return userRepository.findAllUniqueSpecializations();
    }

    @Transactional
    public CreateStaffAccountResponse createStaffAccount(CreateStaffAccountRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }

        boolean passwordGenerated = request.getPassword() == null || request.getPassword().isBlank();
        String rawPassword;
        if (passwordGenerated) {
            rawPassword = "changeme123";
        } else {
            rawPassword = request.getPassword();
        }

        User savedUser = userRepository.save(User.builder()
                .email(normalizedEmail)
                .password(passwordEncoder.encode(rawPassword))
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .setupCompleted(true) // Mark as setup-completed for staff created by admin
                .provider(AuthProvider.LOCAL)
                .verified(false)
                .build());

        return CreateStaffAccountResponse.builder()
                .userId(savedUser.getId())
                .email(savedUser.getEmail())
                .passwordGenerated(passwordGenerated)
                .generatedPassword(passwordGenerated ? rawPassword : null)
                .build();
    }

    @Transactional
    public void deleteInternalUser(UUID id) {
        User user = findUserById(id);
        userRepository.delete(user);
    }

    @Transactional
    public String updateInternalUserEmail(UUID id, String email) {
        User user = findUserById(id);

        String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
        if (normalizedEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required.");
        }

        if (!normalizedEmail.equals(user.getEmail()) && userRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }

        user.setEmail(normalizedEmail);
        return userRepository.save(user).getEmail();
    }

    public List<DoctorUserResponse> getDoctors(Role role, UserStatus status) {
        if (role != Role.DOCTOR) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only role=DOCTOR is supported for listing");
        }

        List<User> users = status == null
                ? userRepository.findByRole(role)
                : userRepository.findByRoleAndStatus(role, status);

        return users.stream()
                .filter(user -> user.getDoctorProfile() != null)
            .map(this::toDoctorUserResponse)
                .toList();
    }

    public List<DoctorUserResponse> getDoctorsBySpecialty(String specialty) {
        List<User> users = userRepository.findByRoleAndSpecialty(Role.DOCTOR, specialty);
        return users.stream()
            .filter(user -> user.getDoctorProfile() != null)
            .map(this::toDoctorUserResponse)
            .toList();
    }

    public BaseUserResponse getPatientProfile(UUID id) {
        User user = findUserById(id);
        if (user.getRole() != Role.PATIENT) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient profile not found for user ID: " + id);
        }

        PatientProfile profile = user.getPatientProfile();
        return PatientUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole())
                .status(user.getStatus())
                .verified(user.isVerified())
                .profilePictureUrl(user.getProfilePictureUrl())
                .setupCompleted(user.isSetupCompleted())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .firstName(profile != null ? profile.getFirstName() : null)
                .lastName(profile != null ? profile.getLastName() : null)
                .dateOfBirth(profile != null ? profile.getDateOfBirth() : null)
                .gender(profile != null ? profile.getGender() : null)
                .bloodType(profile != null ? profile.getBloodType() : null)
                .allergies(profile != null ? profile.getAllergies() : null)
                .chronicDiseases(profile != null ? profile.getChronicDiseases() : null)
                .height(profile != null ? profile.getHeight() : null)
                .weight(profile != null ? profile.getWeight() : null)
                .emergencyContactName(profile != null ? profile.getEmergencyContactName() : null)
                .emergencyContactPhone(profile != null ? profile.getEmergencyContactPhone() : null)
                .insuranceId(profile != null ? profile.getInsuranceId() : null)
                .primaryDoctorId(profile != null ? profile.getPrimaryDoctorId() : null)
                .build();
    }

    public DoctorUserResponse getDoctorProfile(UUID id) {
        User user = findUserById(id);
        if (user.getRole() != Role.DOCTOR) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor profile not found for user ID: " + id);
        }

        return toDoctorUserResponse(user);
    }

    public List<DoctorUserResponse> getAllDoctorProfiles() {
        return userRepository.findAllByRole(Role.DOCTOR)
                .stream()
                .map(this::toDoctorUserResponse)
                .toList();
    }

    public List<LaboratoryUserResponse> getAllLaboratoryProfiles() {
        return userRepository.findAllByRole(Role.LABO)
                .stream()
                .map(this::toLaboratoryUserResponse)
                .toList();
    }

    private DoctorUserResponse toDoctorUserResponse(User user) {
        if (user.getRole() != Role.DOCTOR) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor profile not found for user ID: " + user.getId());
        }

        DoctorProfile profile = user.getDoctorProfile();
        return DoctorUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole())
                .status(user.getStatus())
                .verified(user.isVerified())
                .profilePictureUrl(user.getProfilePictureUrl())
                .setupCompleted(user.isSetupCompleted())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .firstName(profile != null ? profile.getFirstName() : null)
                .lastName(profile != null ? profile.getLastName() : null)
                .specialization(profile != null ? profile.getSpecialization() : null)
                .licenseNumber(profile != null ? profile.getLicenseNumber() : null)
                .yearsOfExperience(profile != null ? profile.getYearsOfExperience() : null)
                .consultationFee(profile != null ? profile.getConsultationFee() : null)
                .biography(profile != null ? profile.getBiography() : null)
                .clinicAddress(profile != null ? profile.getClinicAddress() : null)
                .hospitalId(profile != null ? profile.getHospitalId() : null)
                .availabilitySchedule(profile != null ? profile.getAvailabilitySchedule() : null)
                .isverifiedByAdmin(profile != null ? profile.getIsverifiedByAdmin() : null)
                .build();
    }

    public BaseUserResponse getLaboratoryProfile(UUID id) {
        User user = findUserById(id);
        if (user.getRole() != Role.LABO) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratory profile not found for user ID: " + id);
        }

        return toLaboratoryUserResponse(user);
    }

    public BaseUserResponse getHospitalProfile(UUID id) {
        User user = findUserById(id);
        if (user.getRole() != Role.HOSPITAL) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Hospital profile not found for user ID: " + id);
        }

        HospitalProfile profile = user.getHospitalProfile();
        return HospitalUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole())
                .status(user.getStatus())
                .verified(user.isVerified())
                .profilePictureUrl(user.getProfilePictureUrl())
                .setupCompleted(user.isSetupCompleted())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .name(profile.getName())
                .registrationNumber(profile.getRegistrationNumber())
                .address(profile.getAddress())
                .isverifiedByAdmin(profile.getIsverifiedByAdmin())
                .type(profile.getType())
                .build();
    }

    public BaseUserResponse getInsuranceProfile(UUID id) {
        User user = findUserById(id);
        if (user.getRole() != Role.INSURANCE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Insurance profile not found for user ID: " + id);
        }

        InsuranceProfile profile = user.getInsuranceProfile();
        return InsuranceUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole())
                .status(user.getStatus())
                .verified(user.isVerified())
                .profilePictureUrl(user.getProfilePictureUrl())
                .setupCompleted(user.isSetupCompleted())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .companyName(profile != null ? profile.getCompanyName() : null)
                .registrationNumber(profile != null ? profile.getRegistrationNumber() : null)
                .address(profile != null ? profile.getAddress() : null)
                .coverageTypes(profile != null ? profile.getCoverageTypes() : null)
                .claimProcessDescription(profile != null ? profile.getClaimProcessDescription() : null)
                .build();
    }

    public BaseUserResponse getPharmacistProfile(UUID id) {
        User user = findUserById(id);
        if (user.getRole() != Role.PHARMACIST || user.getPharmacistProfile() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Pharmacist profile not found for user ID: " + id);
        }

        PharmacistProfile profile = user.getPharmacistProfile();

        return PharmacistUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole())
                .status(user.getStatus())
                .verified(user.isVerified())
                .profilePictureUrl(user.getProfilePictureUrl())
                .setupCompleted(user.isSetupCompleted())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .pharmacyName(profile.getPharmacyName())
                .licenseNumber(profile.getLicenseNumber())
                .region(profile.getRegion())
                .build();
    }

    public BaseUserResponse getDeliveryAgentProfile(UUID id) {
        User user = findUserById(id);
        if (user.getRole() != Role.DELIVERY_AGENT || user.getDeliveryAgentProfile() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Delivery agent profile not found for user ID: " + id);
        }

        DeliveryAgentProfile profile = user.getDeliveryAgentProfile();

        return DeliveryAgentUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole())
                .status(user.getStatus())
                .verified(user.isVerified())
                .profilePictureUrl(user.getProfilePictureUrl())
                .setupCompleted(user.isSetupCompleted())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .deliveryName(profile.getDeliveryName())
                .vehicleType(profile.getVehicleType())
                .build();
    }

    public BaseUserResponse getCentralPharmacyProfile(UUID id) {
        User user = findUserById(id);

        if (user.getRole() != Role.CENTRAL_PHARMACY || user.getCentralPharmacyProfile() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Central Pharmacy profile not found");
        }

        CentralPharmacyProfile profile = user.getCentralPharmacyProfile();

        return CentralPharmacyUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole())
                .status(user.getStatus())
                .verified(user.isVerified())
                .profilePictureUrl(user.getProfilePictureUrl())
                .setupCompleted(user.isSetupCompleted())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .institutionName(profile.getInstitutionName())
                .headquarters(profile.getHeadquarters())
                .build();
    }

    @Transactional
    public BaseUserResponse updateCurrentUserProfile(User currentUser, BaseUserRequest request) {
        // Always work on a managed entity to ensure nested profile updates are
        // persisted.
        User managedUser = findUserById(currentUser.getId());

        // 1. Update common User fields
        if (request.getEmail() != null && !request.getEmail().equals(managedUser.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already taken");
            }
            managedUser.setEmail(request.getEmail());
        }

        if (request.getPhoneNumber() != null) {
            managedUser.setPhoneNumber(request.getPhoneNumber());
        }

        if (request.getProfilePictureUrl() != null) {
            managedUser.setProfilePictureUrl(request.getProfilePictureUrl());
        }

        // 2. Delegate role-specific updates to strategy
        updateProfileStrategyFactory.getStrategy(managedUser.getRole())
                .updateProfile(managedUser, request);

        // 3. Save and return updated profile
        User updatedUser = userRepository.save(managedUser);
        return getUserProfileById(updatedUser.getId());
    }

    @Transactional
    public BaseUserResponse updateProfileImage(User user, org.springframework.web.multipart.MultipartFile file) {
        String fileUrl = fileStorageService.storeFile(file);
        user.setProfilePictureUrl(fileUrl);
        User updatedUser = userRepository.save(user);
        return getUserProfileById(updatedUser.getId());
    }

    public BaseUserResponse getUserProfileById(UUID id) {
        User user = findUserById(id);
        if (user.getRole() == null) {
            return InitialUserResponse.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .phoneNumber(user.getPhoneNumber())
                    .role(null)
                    .status(user.getStatus())
                    .verified(user.isVerified())
                    .setupCompleted(user.isSetupCompleted())
                    .profilePictureUrl(user.getProfilePictureUrl())
                    .createdAt(user.getCreatedAt())
                    .updatedAt(user.getUpdatedAt())
                    .lastLoginAt(user.getLastLoginAt())
                    .build();
        }
        return switch (user.getRole()) {
            case USER, ADMIN -> InitialUserResponse.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .phoneNumber(user.getPhoneNumber())
                    .role(user.getRole())
                    .status(user.getStatus())
                    .verified(user.isVerified())
                    .setupCompleted(user.isSetupCompleted())
                    .profilePictureUrl(user.getProfilePictureUrl())
                    .createdAt(user.getCreatedAt())
                    .updatedAt(user.getUpdatedAt())
                    .lastLoginAt(user.getLastLoginAt())
                    .build();
            case PATIENT -> getPatientProfile(id);
            case DOCTOR -> getDoctorProfile(id);
            case LABO -> getLaboratoryProfile(id);
            case HOSPITAL -> getHospitalProfile(id);
            case INSURANCE -> getInsuranceProfile(id);
            case PHARMACIST -> getPharmacistProfile(id);
            case DELIVERY_AGENT -> getDeliveryAgentProfile(id);
            case CENTRAL_PHARMACY -> getCentralPharmacyProfile(id);
        };
    }

    public BaseUserResponse getUserProfileByRoleAndId(String roleStr, UUID id) {
        User user = findUserById(id);
        Role role;
        try {
            role = Role.valueOf(roleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role: " + roleStr);
        }

        return switch (role) {
            case USER, ADMIN -> InitialUserResponse.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .phoneNumber(user.getPhoneNumber())
                    .role(user.getRole())
                    .status(user.getStatus())
                    .verified(user.isVerified())
                    .setupCompleted(user.isSetupCompleted())
                    .profilePictureUrl(user.getProfilePictureUrl())
                    .createdAt(user.getCreatedAt())
                    .updatedAt(user.getUpdatedAt())
                    .lastLoginAt(user.getLastLoginAt())
                    .build();
            case PATIENT -> getPatientProfile(id);
            case DOCTOR -> getDoctorProfile(id);
            case LABO -> getLaboratoryProfile(id);
            case HOSPITAL -> getHospitalProfile(id);
            case INSURANCE -> getInsuranceProfile(id);
            case PHARMACIST -> getPharmacistProfile(id);
            case DELIVERY_AGENT -> getDeliveryAgentProfile(id);
            case CENTRAL_PHARMACY -> getCentralPharmacyProfile(id);
        };
    }

    private String generateSecurePassword() {
        StringBuilder passwordBuilder = new StringBuilder();
        for (int i = 0; i < GENERATED_PASSWORD_LENGTH; i++) {
            int index = SECURE_RANDOM.nextInt(STAFF_PASSWORD_CHARS.length());
            passwordBuilder.append(STAFF_PASSWORD_CHARS.charAt(index));
        }
        return passwordBuilder.toString();
    }

    private User findUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with ID: " + id));
    }

    private LaboratoryUserResponse toLaboratoryUserResponse(User user) {
        if (user.getRole() != Role.LABO) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Laboratory profile not found for user ID: " + user.getId());
        }

        LaboratoryProfile profile = user.getLaboratoryProfile();
        return LaboratoryUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole())
                .status(user.getStatus())
                .verified(user.isVerified())
                .profilePictureUrl(user.getProfilePictureUrl())
                .setupCompleted(user.isSetupCompleted())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .labName(profile != null ? profile.getLabName() : null)
                .registrationNumber(profile != null ? profile.getRegistrationNumber() : null)
                .address(profile != null ? profile.getAddress() : null)
                .accreditation(profile != null ? profile.getAccreditation() : null)
                .openingHours(profile != null ? profile.getOpeningHours() : null)
                .supportedTests(profile != null ? profile.getSupportedTests() : null)
                .isverifiedByAdmin(profile != null ? profile.getIsverifiedByAdmin() : null)
                .build();
    }
}
