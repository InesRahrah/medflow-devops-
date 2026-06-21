
package com.medflow.userservice.controller;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.BaseUserResponse;
import com.medflow.userservice.dto.AccessCodeResponse;
import com.medflow.userservice.dto.DoctorUserResponse;
import com.medflow.userservice.dto.LaboratoryUserResponse;
import com.medflow.userservice.dto.CreateStaffAccountRequest;
import com.medflow.userservice.dto.CreateStaffAccountResponse;
import com.medflow.userservice.dto.InternalUserEmailUpdateRequest;
import com.medflow.userservice.dto.DoctorUserResponse;
import com.medflow.userservice.dto.OnUpdate;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import com.medflow.userservice.entity.UserStatus;
import com.medflow.userservice.service.PatientAccessCodeService;
import com.medflow.userservice.service.UserService;
import com.medflow.userservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class UserController {

    private final UserService userService;
    private final PatientAccessCodeService patientAccessCodeService;
    private final UserRepository userRepository;

    @GetMapping("/specialties")
    public ResponseEntity<List<String>> getSpecialties() {
        return ResponseEntity.ok(userService.getAllUniqueSpecializations());
    }

    @GetMapping(params = "role")
    public ResponseEntity<List<DoctorUserResponse>> getUsersByRole(
            @RequestParam Role role,
            @RequestParam(required = false) UserStatus status) {
        return ResponseEntity.ok(userService.getDoctors(role, status));
    }

    @GetMapping("/me")
    public ResponseEntity<BaseUserResponse> me(@AuthenticationPrincipal User user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User account is not active");
        }

        return ResponseEntity.ok(userService.getUserProfileById(user.getId()));
    }

    @PutMapping("/me")
    public ResponseEntity<BaseUserResponse> updateMe(
            @AuthenticationPrincipal User user,
            @Validated(OnUpdate.class) @RequestBody BaseUserRequest request) {
        log.debug("Received update request for user: {}", user.getEmail());
        return ResponseEntity.ok(userService.updateCurrentUserProfile(user, request));
    }

    @PostMapping("/me/profile-image")
    public ResponseEntity<BaseUserResponse> uploadProfileImage(
            @AuthenticationPrincipal User user,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        log.debug("Received profile image upload request for user: {}", user.getEmail());
        return ResponseEntity.ok(userService.updateProfileImage(user, file));
    }

    @GetMapping("/me/access-code")
    public ResponseEntity<AccessCodeResponse> getMyAccessCode(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(patientAccessCodeService.getOrRotateCode(user));
    }

    @PostMapping("/me/access-code/regenerate")
    public ResponseEntity<AccessCodeResponse> regenerateMyAccessCode(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(patientAccessCodeService.regenerateCode(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseUserResponse> getUserById(@PathVariable UUID id) {
        log.debug("Received request to get user by ID: {}", id);
        try {
            BaseUserResponse response = userService.getUserProfileById(id);
            log.debug("Successfully retrieved profile for user ID: {}", id);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error retrieving user profile for ID {}: {}", id, e.getMessage());
            throw e;
        }
    }

    @GetMapping("/doctors")
    public ResponseEntity<List<DoctorUserResponse>> getDoctors(@RequestParam(required = false) String specialty) {
        log.debug("Received request to list all doctors");
        if (specialty != null && !specialty.isBlank()) {
            return ResponseEntity.ok(userService.getDoctorsBySpecialty(specialty));
        } else {
            return ResponseEntity.ok(userService.getAllDoctorProfiles());
        }
    }

    @GetMapping("/laboratories")
    public ResponseEntity<List<LaboratoryUserResponse>> getLaboratories() {
        log.debug("Received request to list all laboratories");
        return ResponseEntity.ok(userService.getAllLaboratoryProfiles());
    }

    @GetMapping("/doctors/{id}")
    public ResponseEntity<DoctorUserResponse> getDoctorById(@PathVariable UUID id) {
        log.debug("Received request to get doctor by ID: {}", id);
        return ResponseEntity.ok(userService.getDoctorProfile(id));
    }

    @GetMapping("/{role}/{id}")
    public ResponseEntity<BaseUserResponse> getUserByRoleAndId(@PathVariable String role, @PathVariable UUID id) {
        log.debug("Received request to get user by role {} and ID: {}", role, id);
        return ResponseEntity.ok(userService.getUserProfileByRoleAndId(role, id));
    }

    @PostMapping("/internal/staff-account")
    public ResponseEntity<CreateStaffAccountResponse> createStaffAccount(
            @Validated @RequestBody CreateStaffAccountRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createStaffAccount(request));
    }

    @GetMapping("/internal/info/{id}")
    public ResponseEntity<?> getInternalUserInfo(@PathVariable UUID id) {
        return userRepository.findById(id)
                .map(user -> ResponseEntity.ok(new java.util.LinkedHashMap<String, Object>() {
                    {
                        put("id", user.getId());
                        put("email", user.getEmail());
                        put("firstName", "");
                        put("lastName", "");
                    }
                }))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/internal/{id}")
    public ResponseEntity<Void> deleteInternalUser(@PathVariable UUID id) {
        userService.deleteInternalUser(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/internal/{id}/email")
    public ResponseEntity<?> updateInternalUserEmail(
            @PathVariable UUID id,
            @Validated @RequestBody InternalUserEmailUpdateRequest request) {
        String updatedEmail = userService.updateInternalUserEmail(id, request.getEmail());
        return ResponseEntity.ok(new java.util.LinkedHashMap<String, Object>() {
            {
                put("id", id);
                put("email", updatedEmail);
            }
        });
    }
}
