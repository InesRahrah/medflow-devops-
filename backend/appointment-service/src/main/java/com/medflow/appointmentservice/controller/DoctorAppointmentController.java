package com.medflow.appointmentservice.controller;

import com.medflow.appointmentservice.dto.AppointmentDTO;
import com.medflow.appointmentservice.dto.DoctorPatientSummaryDTO;
import com.medflow.appointmentservice.mapper.AppointmentMapper;
import com.medflow.appointmentservice.service.AppointmentService;
import com.medflow.appointmentservice.service.DoctorAvailabilityService;
import com.medflow.appointmentservice.service.UserProfileLookupService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/doctors")
public class DoctorAppointmentController {

    private final AppointmentService appointmentService;
    private final UserProfileLookupService userProfileLookupService;
    private final DoctorAvailabilityService doctorAvailabilityService;

    public DoctorAppointmentController(AppointmentService appointmentService,
                                       UserProfileLookupService userProfileLookupService,
                                       DoctorAvailabilityService doctorAvailabilityService) {
        this.appointmentService = appointmentService;
        this.userProfileLookupService = userProfileLookupService;
        this.doctorAvailabilityService = doctorAvailabilityService;
    }

    @GetMapping("/{doctorId}/appointments")
    public ResponseEntity<List<AppointmentDTO>> getDoctorAppointments(@PathVariable UUID doctorId) {
        return ResponseEntity.ok(
                AppointmentMapper.toDTOList(appointmentService.getScheduledAppointmentsByDoctorId(doctorId), userProfileLookupService)
        );
    }

    @GetMapping("/{doctorId}/patients")
    public ResponseEntity<List<DoctorPatientSummaryDTO>> getDoctorPatients(@PathVariable UUID doctorId) {
        return ResponseEntity.ok(appointmentService.getDoctorPatients(doctorId));
    }

    @GetMapping("/{doctorId}/available-dates")
    public ResponseEntity<List<String>> getAvailableDates(@PathVariable UUID doctorId,
                                                          @RequestParam int year,
                                                          @RequestParam int month) {
        return ResponseEntity.ok(doctorAvailabilityService.getAvailableDates(doctorId, year, month));
    }

    @GetMapping("/{doctorId}/available-slots")
    public ResponseEntity<List<String>> getAvailableSlots(@PathVariable UUID doctorId,
                                                          @RequestParam LocalDate date) {
        return ResponseEntity.ok(doctorAvailabilityService.getAvailableSlots(doctorId, date));
    }

    @GetMapping("/{doctorId}/profile")
    public ResponseEntity<JsonNode> getDoctorProfile(@PathVariable UUID doctorId) {
        return ResponseEntity.ok(userProfileLookupService.getDoctorProfile(doctorId));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentDoctor(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        UserProfileLookupService.UserProfile profile =
                userProfileLookupService.getCurrentUserProfile(authorizationHeader, userIdHeader);

        if (profile == null || profile.getId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Unable to resolve authenticated doctor"));
        }

        if (profile.getRole() != null && !"DOCTOR".equalsIgnoreCase(profile.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Authenticated user is not a doctor"));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", profile.getId());
        response.put("doctorId", profile.getId());
        response.put("role", profile.getRole() == null ? "DOCTOR" : profile.getRole());
        if (profile.getDisplayName() != null) {
            response.put("displayName", profile.getDisplayName());
        }
        return ResponseEntity.ok(response);
    }
}