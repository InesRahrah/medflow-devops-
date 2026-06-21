package com.medflow.appointmentservice.controller;

import com.medflow.appointmentservice.dto.AppointmentDashboardResponse;
import com.medflow.appointmentservice.service.AppointmentDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/admin/appointments")
@RequiredArgsConstructor
public class AdminAppointmentDashboardController {

    private final AppointmentDashboardService appointmentDashboardService;

    @GetMapping("/dashboard")
    public ResponseEntity<AppointmentDashboardResponse> getDashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "5") int symptomLimit) {
        return ResponseEntity.ok(appointmentDashboardService.getDashboard(from, to, symptomLimit));
    }
}