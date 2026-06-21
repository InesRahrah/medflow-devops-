package com.medflow.appointmentservice.controller;

import com.medflow.appointmentservice.dto.AppointmentDTO;
import com.medflow.appointmentservice.mapper.AppointmentMapper;
import com.medflow.appointmentservice.service.AppointmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/v1/patients")
public class PatientAppointmentController {

    @Autowired
    private AppointmentService appointmentService;

    @GetMapping("/{patientId}/is-first-appointment")
    public ResponseEntity<Map<String, Boolean>> isFirstAppointment(
            @PathVariable UUID patientId,
            @RequestParam(required = false) UUID doctorId) {
        boolean isFirst = appointmentService.isFirstAppointment(patientId, doctorId);
        return ResponseEntity.ok(Map.of("isFirstAppointment", isFirst));
    }

    @GetMapping("/{patientId}/appointments")
    public ResponseEntity<List<AppointmentDTO>> getPatientAppointments(
            @PathVariable UUID patientId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        UUID requesterId = parseUuid(userIdHeader);
        if (requesterId == null || !requesterId.equals(patientId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not authorized to access these appointments");
        }
        return ResponseEntity.ok(
                AppointmentMapper.toDTOList(appointmentService.getAppointmentsByPatientId(patientId), patientId)
        );
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
}
