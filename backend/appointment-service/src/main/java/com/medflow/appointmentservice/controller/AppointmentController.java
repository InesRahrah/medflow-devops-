package com.medflow.appointmentservice.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medflow.appointmentservice.dto.AppointmentDTO;
import com.medflow.appointmentservice.entity.Appointment;
import com.medflow.appointmentservice.entity.VisitType;
import com.medflow.appointmentservice.mapper.AppointmentMapper;
import com.medflow.appointmentservice.service.AppointmentService;
import com.medflow.appointmentservice.service.UserProfileLookupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping({"/appointments", "/api/v1/appointments"})
public class AppointmentController {

    @Autowired
    private AppointmentService appointmentService;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserProfileLookupService userProfileLookupService;

    // DTO classes for request bodies
    public static class CreateAppointmentRequest {
        private Appointment appointment;

        // Getters and setters
        public Appointment getAppointment() { return appointment; }
        public void setAppointment(Appointment appointment) { this.appointment = appointment; }
    }

    public static class PostponeRequest {
        private LocalDateTime newScheduledAt;
        private String reason;
        private String updatedAiSummary;

        public LocalDateTime getNewScheduledAt() { return newScheduledAt; }
        public void setNewScheduledAt(LocalDateTime newScheduledAt) { this.newScheduledAt = newScheduledAt; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
        public String getUpdatedAiSummary() { return updatedAiSummary; }
        public void setUpdatedAiSummary(String updatedAiSummary) { this.updatedAiSummary = updatedAiSummary; }
    }

    public static class StatusUpdateRequest {
        private String newStatus;

        public String getNewStatus() { return newStatus; }
        public void setNewStatus(String newStatus) { this.newStatus = newStatus; }
    }

    public static class CancelRequest {
        private String requestedBy;

        public String getRequestedBy() { return requestedBy; }
        public void setRequestedBy(String requestedBy) { this.requestedBy = requestedBy; }
    }

    /**
     * Create a new appointment.
     * Supports both patient-initiated and doctor-initiated flows:
     * - If createdByRole is "DOCTOR", appointment awaits patient confirmation (PENDING_PATIENT_CONFIRMATION)
     * - Otherwise (default "PATIENT"), appointment awaits doctor confirmation (PENDING_DOCTOR_CONFIRMATION)
     * For the patient's first appointment with a doctor, preconsultation questions are automatically added
     * from the doctor's question templates.
     * Returns the created appointment with HTTP 201.
     */
    @PostMapping
    public ResponseEntity<AppointmentDTO> createAppointment(
            @RequestBody JsonNode payload,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        JsonNode appointmentNode = payload != null && payload.has("appointment") ? payload.get("appointment") : payload;
        Appointment appointment = objectMapper.convertValue(appointmentNode, Appointment.class);
        if (appointment == null || appointment.getIdPatient() == null || appointment.getIdDoctor() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid appointment payload: idPatient and idDoctor are required");
        }

        // Determine createdByRole with deterministic checks before remote lookup.
        String createdByRole = null;
        if (payload != null && payload.has("createdByRole")) {
            String explicitRole = payload.get("createdByRole").asText();
            if ("DOCTOR".equalsIgnoreCase(explicitRole) || "PATIENT".equalsIgnoreCase(explicitRole)) {
                createdByRole = explicitRole.toUpperCase();
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "createdByRole must be DOCTOR or PATIENT");
            }
        }

        if (createdByRole == null) {
            UUID requesterId = parseUuid(userIdHeader);
            if (requesterId != null) {
                if (requesterId.equals(appointment.getIdDoctor())) {
                    createdByRole = "DOCTOR";
                } else if (requesterId.equals(appointment.getIdPatient())) {
                    createdByRole = "PATIENT";
                }
            }
        }

        if (createdByRole == null) {
            try {
                var userProfile = userProfileLookupService.getCurrentUserProfile(authHeader, userIdHeader);
                if (userProfile != null) {
                    if (appointment.getIdDoctor() != null && appointment.getIdDoctor().equals(userProfile.getId())) {
                        createdByRole = "DOCTOR";
                    } else if (appointment.getIdPatient() != null && appointment.getIdPatient().equals(userProfile.getId())) {
                        createdByRole = "PATIENT";
                    } else if ("DOCTOR".equalsIgnoreCase(userProfile.getRole())) {
                        createdByRole = "DOCTOR";
                    } else if ("PATIENT".equalsIgnoreCase(userProfile.getRole())) {
                        createdByRole = "PATIENT";
                    }
                }
            } catch (Exception ignored) {
                // Handled below with explicit error instead of silent misrouting.
            }
        }

        if (createdByRole == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unable to resolve appointment creator role. Provide createdByRole as DOCTOR or PATIENT."
            );
        }

        try {
            Appointment created = appointmentService.createAppointment(appointment, createdByRole);
            AppointmentDTO dto = AppointmentMapper.toDTO(created, parseUuid(userIdHeader));
            return ResponseEntity.status(HttpStatus.CREATED).body(dto);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    private UUID parseUuid(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    /**
     * Retrieve all appointments.
     * Returns a list of appointments with HTTP 200.
     */
    @GetMapping
    public ResponseEntity<List<AppointmentDTO>> getAllAppointments(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        List<Appointment> appointments = appointmentService.getAllAppointments();
        UUID currentPatientId = parseUuid(userIdHeader);
        List<AppointmentDTO> dtos = AppointmentMapper.toDTOList(appointments, currentPatientId);
        return ResponseEntity.ok(dtos);
    }

    /**
     * Retrieve a single appointment by its ID.
     * Returns HTTP 200 if found, HTTP 404 if not.
     */
    @GetMapping("/{appointmentId}")
    public ResponseEntity<AppointmentDTO> getAppointmentById(
            @PathVariable Long appointmentId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        Optional<Appointment> appointment = appointmentService.getAppointmentById(appointmentId);
        if (appointment.isPresent()) {
            AppointmentDTO dto = AppointmentMapper.toDTO(appointment.get(), parseUuid(userIdHeader));
            return ResponseEntity.ok(dto);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{appointmentId}/telemed/join")
    public ResponseEntity<Map<String, String>> joinTelemedAppointment(
            @PathVariable Long appointmentId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        UUID requesterId = parseUuid(userIdHeader);
        if (requesterId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Patient authentication is required");
        }

        Appointment appointment = appointmentService.getAppointmentById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

        if (appointment.getIdPatient() == null || !requesterId.equals(appointment.getIdPatient())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not authorized to join this appointment");
        }

        if (appointment.getVisitType() != VisitType.TELEMEDICINE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This appointment is not a telemedicine visit");
        }

        if (appointment.getStatus() == null || !"SCHEDULED".equalsIgnoreCase(appointment.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Appointment is not in SCHEDULED state");
        }

        if (appointment.getMeetingUrl() == null || appointment.getMeetingUrl().isBlank()) {
            appointment = appointmentService.ensureTelemedicineMeetingLinkForAcceptedAppointment(appointmentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
        }

        if (appointment.getMeetingUrl() == null || appointment.getMeetingUrl().isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Meeting link is not configured for this appointment");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime joinStart = AppointmentMapper.computeJoinAvailableAt(appointment);
        LocalDateTime joinDeadline = AppointmentMapper.computeJoinDeadline(appointment);

        if (joinStart == null || joinDeadline == null || now.isBefore(joinStart) || now.isAfter(joinDeadline)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Join window is not currently open");
        }

        return ResponseEntity.ok(Map.of("joinUrl", appointment.getMeetingUrl()));
    }

    /**
     * Delete an appointment by its ID.
     * Returns HTTP 204 if deleted, HTTP 404 if not found.
     */
    @DeleteMapping("/{appointmentId}")
    public ResponseEntity<Void> deleteAppointment(@PathVariable Long appointmentId) {
        throw new ResponseStatusException(HttpStatus.METHOD_NOT_ALLOWED, "Direct delete is disabled. Use cancellation request flow.");
    }

    /**
     * Request appointment cancellation by role (PATIENT or DOCTOR).
     * The other party must confirm cancellation.
     */
    @PatchMapping("/{appointmentId}/cancel-request")
    public ResponseEntity<AppointmentDTO> requestCancellation(@PathVariable Long appointmentId, @RequestBody CancelRequest request) {
        Optional<Appointment> updated = appointmentService.requestCancellation(appointmentId, request.getRequestedBy());
        if (updated.isPresent()) {
            return ResponseEntity.ok(AppointmentMapper.toDTO(updated.get()));
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid cancel request. requestedBy must be PATIENT or DOCTOR");
    }

    /**
     * Patient confirms doctor's cancellation request.
     */
    @PostMapping("/{appointmentId}/confirm-cancel/patient")
    public ResponseEntity<AppointmentDTO> confirmCancellationByPatient(@PathVariable Long appointmentId) {
        Optional<Appointment> updated = appointmentService.confirmCancellationByPatient(appointmentId);
        if (updated.isPresent()) {
            return ResponseEntity.ok(AppointmentMapper.toDTO(updated.get()));
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Doctor confirms patient's cancellation request.
     */
    @PostMapping("/{appointmentId}/confirm-cancel/doctor")
    public ResponseEntity<AppointmentDTO> confirmCancellationByDoctor(@PathVariable Long appointmentId) {
        Optional<Appointment> updated = appointmentService.confirmCancellationByDoctor(appointmentId);
        if (updated.isPresent()) {
            return ResponseEntity.ok(AppointmentMapper.toDTO(updated.get()));
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Doctor requests to postpone an appointment.
     * Accepts new scheduledAt datetime in request body.
     * Sets the pendingScheduledAt field and notifies the patient.
     * Returns updated appointment with HTTP 200.
     */
    @PatchMapping("/{appointmentId}/postpone")
    public ResponseEntity<AppointmentDTO> requestPostponeAppointment(@PathVariable Long appointmentId, @RequestBody PostponeRequest request) {
        Optional<Appointment> updated = appointmentService.requestPostponeAppointment(appointmentId, request.getNewScheduledAt());
        if (updated.isPresent()) {
            AppointmentDTO dto = AppointmentMapper.toDTO(updated.get());
            return ResponseEntity.ok(dto);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Patient requests to postpone an appointment.
     * Accepts new scheduledAt datetime in request body.
     * Sets the pendingScheduledAt field.
     * Returns updated appointment with HTTP 200.
     */
    @PatchMapping("/{appointmentId}/patient-postpone")
    public ResponseEntity<AppointmentDTO> requestPatientPostponeAppointment(@PathVariable Long appointmentId, @RequestBody PostponeRequest request) {
        Optional<Appointment> updated = appointmentService.requestPatientPostponeAppointment(
                appointmentId, request.getNewScheduledAt(), request.getReason(), request.getUpdatedAiSummary());
        if (updated.isPresent()) {
            AppointmentDTO dto = AppointmentMapper.toDTO(updated.get());
            return ResponseEntity.ok(dto);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Doctor rejects patient's postpone request and proposes an alternative datetime.
     * Clears the patient's pending time, sets doctor's alternative as the new pendingScheduledAt,
     * and awaits patient confirmation.
     */
    @PostMapping("/{appointmentId}/doctor-reject-postpone")
    public ResponseEntity<AppointmentDTO> rejectPatientPostponeByDoctor(
            @PathVariable Long appointmentId,
            @RequestBody PostponeRequest request) {
        if (request.getNewScheduledAt() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "alternativeScheduledAt (newScheduledAt) is required when rejecting a postpone request");
        }
        Optional<Appointment> updated = appointmentService.rejectPatientPostponeByDoctor(appointmentId, request.getNewScheduledAt());
        if (updated.isPresent()) {
            return ResponseEntity.ok(AppointmentMapper.toDTO(updated.get()));
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending patient postpone request found for this appointment");
    }

    /**
     * Doctor confirms patient's postpone request.
     * Applies pendingScheduledAt as scheduledAt.
     * Returns updated appointment with HTTP 200.
     */
    @PostMapping("/{appointmentId}/doctor-confirm")
    public ResponseEntity<AppointmentDTO> confirmPatientPostponeByDoctor(@PathVariable Long appointmentId) {
        Optional<Appointment> updated = appointmentService.confirmPatientPostponeByDoctor(appointmentId);
        if (updated.isPresent()) {
            AppointmentDTO dto = AppointmentMapper.toDTO(updated.get());
            return ResponseEntity.ok(dto);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Doctor accepts the initial appointment request created by a patient.
     */
    @PostMapping("/{appointmentId}/doctor-accept-request")
    public ResponseEntity<AppointmentDTO> acceptInitialRequestByDoctor(@PathVariable Long appointmentId) {
        try {
            Optional<Appointment> updated = appointmentService.respondToInitialRequestByDoctor(appointmentId, true);
            if (updated.isPresent()) {
                return ResponseEntity.ok(AppointmentMapper.toDTO(updated.get()));
            }
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending initial appointment request found for this appointment");
    }

    /**
     * Doctor refuses the initial appointment request created by a patient.
     */
    @PostMapping("/{appointmentId}/doctor-refuse-request")
    public ResponseEntity<AppointmentDTO> refuseInitialRequestByDoctor(@PathVariable Long appointmentId) {
        Optional<Appointment> updated = appointmentService.respondToInitialRequestByDoctor(appointmentId, false);
        if (updated.isPresent()) {
            return ResponseEntity.ok(AppointmentMapper.toDTO(updated.get()));
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending initial appointment request found for this appointment");
    }

    /**
     * Doctor requests to update appointment status.
     * Accepts new status in request body.
     * Sets pendingStatus field and notifies the patient.
     * Returns updated appointment with HTTP 200.
     */
    @PatchMapping("/{appointmentId}/status")
    public ResponseEntity<AppointmentDTO> requestUpdateStatus(@PathVariable Long appointmentId, @RequestBody StatusUpdateRequest request) {
        Optional<Appointment> updated = appointmentService.requestUpdateStatus(appointmentId, request.getNewStatus());
        if (updated.isPresent()) {
            AppointmentDTO dto = AppointmentMapper.toDTO(updated.get());
            return ResponseEntity.ok(dto);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Patient confirms pending changes.
     * Apply pendingScheduledAt and pendingStatus if any.
     * Returns updated appointment with HTTP 200.
     */
    @PostMapping("/{appointmentId}/confirm")
    public ResponseEntity<AppointmentDTO> confirmAppointmentChange(@PathVariable Long appointmentId) {
        Optional<Appointment> updated = appointmentService.confirmAppointmentChange(appointmentId);
        if (updated.isPresent()) {
            AppointmentDTO dto = AppointmentMapper.toDTO(updated.get());
            return ResponseEntity.ok(dto);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Patient confirms a doctor-created appointment.
     * Appointment status changes from PENDING_PATIENT_CONFIRMATION to SCHEDULED.
     * Doctor receives a confirmation notification.
     */
    @PostMapping("/{appointmentId}/patient-confirm")
    public ResponseEntity<AppointmentDTO> confirmAppointmentByPatient(@PathVariable Long appointmentId) {
        try {
            Optional<Appointment> updated = appointmentService.respondToPatientRequest(appointmentId, true);
            if (updated.isPresent()) {
                AppointmentDTO dto = AppointmentMapper.toDTO(updated.get());
                return ResponseEntity.ok(dto);
            }
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending doctor-created appointment found for this ID");
    }

    /**
     * Patient declines a doctor-created appointment.
     * Appointment status changes from PENDING_PATIENT_CONFIRMATION to REJECTED_BY_PATIENT.
     * Doctor receives a declination notification.
     */
    @PostMapping("/{appointmentId}/patient-decline")
    public ResponseEntity<AppointmentDTO> declineAppointmentByPatient(@PathVariable Long appointmentId) {
        Optional<Appointment> updated = appointmentService.respondToPatientRequest(appointmentId, false);
        if (updated.isPresent()) {
            AppointmentDTO dto = AppointmentMapper.toDTO(updated.get());
            return ResponseEntity.ok(dto);
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending doctor-created appointment found for this ID");
    }

    /**
     * Patient rejects a doctor postpone request.
     * The pending scheduled time is cleared and appointment keeps its current confirmed schedule.
     */
    @PostMapping("/{appointmentId}/reject-postpone/patient")
    public ResponseEntity<AppointmentDTO> rejectDoctorPostponeByPatient(@PathVariable Long appointmentId) {
        Optional<Appointment> updated = appointmentService.rejectDoctorPostponeByPatient(appointmentId);
        if (updated.isPresent()) {
            return ResponseEntity.ok(AppointmentMapper.toDTO(updated.get()));
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending doctor postpone request found for this appointment");
    }

    /**
     * Patient rejects a doctor cancellation request.
     * The pending cancellation is cleared and appointment remains active.
     */
    @PostMapping("/{appointmentId}/reject-cancel/patient")
    public ResponseEntity<AppointmentDTO> rejectDoctorCancellationByPatient(@PathVariable Long appointmentId) {
        Optional<Appointment> updated = appointmentService.rejectDoctorCancellationByPatient(appointmentId);
        if (updated.isPresent()) {
            return ResponseEntity.ok(AppointmentMapper.toDTO(updated.get()));
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending doctor cancellation request found for this appointment");
    }

    /**
     * Doctor explicitly confirms that a patient attended the appointment.
     * This lowers patient risk score in the penalty profile.
     */
    @PostMapping("/{appointmentId}/doctor-confirm-attendance")
    public ResponseEntity<AppointmentDTO> confirmAttendanceByDoctor(
            @PathVariable Long appointmentId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        UUID doctorId = parseUuid(userIdHeader);
        try {
            Optional<Appointment> updated = appointmentService.confirmAttendanceByDoctor(appointmentId, doctorId);
            if (updated.isPresent()) {
                return ResponseEntity.ok(AppointmentMapper.toDTO(updated.get()));
            }
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }
}