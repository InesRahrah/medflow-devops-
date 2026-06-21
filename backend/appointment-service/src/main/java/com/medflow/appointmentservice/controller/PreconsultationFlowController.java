package com.medflow.appointmentservice.controller;

import com.medflow.appointmentservice.service.PreconsultationFlowService;
import com.medflow.appointmentservice.service.UserProfileLookupService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping({"", "/api/v1"})
public class PreconsultationFlowController {

    private final PreconsultationFlowService preconsultationFlowService;
    private final UserProfileLookupService userProfileLookupService;

    public PreconsultationFlowController(PreconsultationFlowService preconsultationFlowService,
                                         UserProfileLookupService userProfileLookupService) {
        this.preconsultationFlowService = preconsultationFlowService;
        this.userProfileLookupService = userProfileLookupService;
    }

    @GetMapping("/doctors/me/preconsultation-template")
    public ResponseEntity<PreconsultationFlowService.TemplatePayload> getMyTemplate(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestHeader(value = "X-Doctor-Id", required = false) String doctorIdHeader) {
        UserProfileLookupService.UserProfile profile = resolveRoleWithFallback(
                authorizationHeader,
                userIdHeader,
                userRoleHeader,
                "DOCTOR"
        );
        Long doctorId = resolveDoctorId(profile, userIdHeader, doctorIdHeader, null);

        // Return 200 with empty body when no template exists so frontend can treat this as "not configured yet".
        return ResponseEntity.ok(preconsultationFlowService.getDoctorTemplate(doctorId).orElse(null));
    }

    @PostMapping("/doctors/me/preconsultation-template")
    public ResponseEntity<PreconsultationFlowService.TemplatePayload> createMyTemplate(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestHeader(value = "X-Doctor-Id", required = false) String doctorIdHeader,
            @RequestBody PreconsultationFlowService.TemplatePayload payload) {
        UserProfileLookupService.UserProfile profile = resolveRoleWithFallback(
                authorizationHeader,
                userIdHeader,
                userRoleHeader,
                "DOCTOR"
        );
        Long doctorId = resolveDoctorId(profile, userIdHeader, doctorIdHeader, payload == null ? null : payload.doctorId());
        PreconsultationFlowService.TemplatePayload created = preconsultationFlowService.createDoctorTemplate(doctorId, payload);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/doctors/me/preconsultation-template")
    public ResponseEntity<PreconsultationFlowService.TemplatePayload> updateMyTemplate(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @RequestHeader(value = "X-Doctor-Id", required = false) String doctorIdHeader,
            @RequestBody PreconsultationFlowService.TemplatePayload payload) {
        UserProfileLookupService.UserProfile profile = resolveRoleWithFallback(
                authorizationHeader,
                userIdHeader,
                userRoleHeader,
                "DOCTOR"
        );
        Long doctorId = resolveDoctorId(profile, userIdHeader, doctorIdHeader, payload == null ? null : payload.doctorId());
        return ResponseEntity.ok(preconsultationFlowService.updateDoctorTemplate(doctorId, payload));
    }

    @GetMapping("/appointments/{appointmentId}/preconsultation")
    public ResponseEntity<PreconsultationFlowService.TemplatePayload> getAppointmentPreconsultationForm(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @PathVariable Long appointmentId) {
        UserProfileLookupService.UserProfile profile = resolveRoleWithFallback(
                authorizationHeader,
                userIdHeader,
                userRoleHeader,
                "PATIENT"
        );
        return ResponseEntity.ok(preconsultationFlowService.getAppointmentForm(appointmentId, profile.getId()));
    }

    @PostMapping("/appointments/{appointmentId}/preconsultation")
    public ResponseEntity<PreconsultationFlowService.ResponsePayload> submitAppointmentPreconsultation(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @PathVariable Long appointmentId,
            @RequestBody PreconsultationFlowService.SubmitPayload payload) {
        UserProfileLookupService.UserProfile profile = resolveRoleWithFallback(
            authorizationHeader,
            userIdHeader,
            userRoleHeader,
            "PATIENT"
        );
        PreconsultationFlowService.ResponsePayload created = preconsultationFlowService.submitAppointmentPreconsultation(
                appointmentId,
                payload,
                profile.getId(),
                resolveNumericId(profile, userIdHeader)
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/appointments/{appointmentId}/preconsultation/response")
    public ResponseEntity<PreconsultationFlowService.ResponsePayload> getAppointmentPreconsultationResponse(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRoleHeader,
            @PathVariable Long appointmentId) {
        UserProfileLookupService.UserProfile profile = resolveRoleWithFallback(
                authorizationHeader,
                userIdHeader,
                userRoleHeader,
                "DOCTOR"
        );
        return ResponseEntity.ok(preconsultationFlowService.getAppointmentResponse(appointmentId, profile.getId()));
    }

    private UserProfileLookupService.UserProfile resolveRoleWithFallback(String authorizationHeader,
                                                                         String userIdHeader,
                                                                         String userRoleHeader,
                                                                         String requiredRole) {
        UserProfileLookupService.UserProfile profile = userProfileLookupService.getCurrentUserProfile(authorizationHeader, userIdHeader);
        if (profile != null && profile.getRole() != null) {
            if (!requiredRole.equalsIgnoreCase(profile.getRole())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Endpoint requires role " + requiredRole);
            }

            boolean hasResolvableIdentity = profile.getId() != null
                    || profile.getNumericId() != null
                    || profile.getRawId() != null;

            if (hasResolvableIdentity) {
                return profile;
            }
        }

        // Legacy compatibility path for local/dev traffic where auth profile is unavailable.
        if (userRoleHeader != null && requiredRole.equalsIgnoreCase(userRoleHeader) && userIdHeader != null) {
            return new UserProfileLookupService.UserProfile(
                    userIdHeader,
                    parseUuid(userIdHeader),
                    parseLong(userIdHeader),
                    userRoleHeader,
                    null,
                    null,
                    null
            );
        }

        if (profile == null || profile.getId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unable to resolve authenticated user");
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Endpoint requires role " + requiredRole);
    }

    private Long resolveDoctorId(UserProfileLookupService.UserProfile profile,
                                 String userIdHeader,
                                 String doctorIdHeader,
                                 Long payloadDoctorId) {
        Long fromProfile = resolveNumericId(profile, userIdHeader);
        if (fromProfile != null) {
            return fromProfile;
        }

        Long fromDoctorHeader = parseResolvableLong(doctorIdHeader);
        if (fromDoctorHeader != null) {
            return fromDoctorHeader;
        }

        if (payloadDoctorId != null) {
            return payloadDoctorId;
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot resolve doctor numeric id from auth context");
    }

    private Long parseResolvableLong(String value) {
        Long numeric = parseLong(value);
        if (numeric != null) {
            return numeric;
        }

        Long fromUuid = uuidToStableLong(parseUuid(value));
        if (fromUuid != null) {
            return fromUuid;
        }

        return stringToStableLong(value);
    }

    private Long resolveNumericId(UserProfileLookupService.UserProfile profile, String userIdHeader) {
        if (profile != null && profile.getNumericId() != null) {
            return profile.getNumericId();
        }

        Long fromHeader = parseLong(userIdHeader);
        if (fromHeader != null) {
            return fromHeader;
        }

        if (profile != null) {
            Long fromRaw = parseLong(profile.getRawId());
            if (fromRaw != null) {
                return fromRaw;
            }

            Long fromUuid = uuidToStableLong(profile.getId());
            if (fromUuid != null) {
                return fromUuid;
            }

            UUID rawUuid = parseUuid(profile.getRawId());
            Long fromRawUuid = uuidToStableLong(rawUuid);
            if (fromRawUuid != null) {
                return fromRawUuid;
            }

            Long fromRawString = stringToStableLong(profile.getRawId());
            if (fromRawString != null) {
                return fromRawString;
            }
        }

        UUID headerUuid = parseUuid(userIdHeader);
        Long fromHeaderUuid = uuidToStableLong(headerUuid);
        if (fromHeaderUuid != null) {
            return fromHeaderUuid;
        }

        return stringToStableLong(userIdHeader);
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private java.util.UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return java.util.UUID.fromString(value.trim());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private Long uuidToStableLong(UUID uuid) {
        if (uuid == null) {
            return null;
        }
        long mixed = uuid.getMostSignificantBits() ^ uuid.getLeastSignificantBits();
        if (mixed == Long.MIN_VALUE) {
            return 0L;
        }
        return Math.abs(mixed);
    }

    private Long stringToStableLong(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        long hash = 1125899906842597L;
        for (int i = 0; i < value.length(); i++) {
            hash = 31 * hash + value.charAt(i);
        }
        if (hash == Long.MIN_VALUE) {
            return 0L;
        }
        return Math.abs(hash);
    }
}
