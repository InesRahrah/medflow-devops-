package com.medflow.appointmentservice.service;

import com.medflow.appointmentservice.entity.Appointment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class AppointmentNotificationService {

    private static final Logger log = LoggerFactory.getLogger(AppointmentNotificationService.class);

    private final RestTemplate restTemplate;

    @Value("${notification.service.enabled:true}")
    private boolean enabled;

    @Value("${notification.service.base-url:http://localhost:8085}")
    private String notificationServiceBaseUrl;

    @Value("${notification.service.endpoint:/api/v1/notifications/internal}")
    private String notificationServiceEndpoint;

    public AppointmentNotificationService(RestTemplateBuilder restTemplateBuilder) {
        this.restTemplate = restTemplateBuilder.build();
    }

    public void sendNotification(UUID recipientId, String recipientRole, String eventType, String message, Appointment appointment, String reason) {
        if (!enabled) {
            return;
        }
        if (recipientId == null || appointment == null) {
            return;
        }

        String url = notificationServiceBaseUrl + notificationServiceEndpoint;

        Map<String, Object> payload = new HashMap<>();
        payload.put("recipientId", recipientId);
        payload.put("recipientRole", recipientRole);
        payload.put("eventType", eventType);
        payload.put("message", message);
        payload.put("appointmentId", appointment.getIdAp());
        payload.put("patientId", appointment.getIdPatient());
        payload.put("doctorId", appointment.getIdDoctor());
        payload.put("scheduledAt", appointment.getScheduledAt());
        payload.put("pendingScheduledAt", appointment.getPendingScheduledAt());
        payload.put("status", appointment.getStatus());
        payload.put("pendingStatus", appointment.getPendingStatus());
        if (reason != null) {
            payload.put("reason", reason);
        }

        try {
            ResponseEntity<Void> response = restTemplate.postForEntity(url, payload, Void.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                log.warn("Notification service returned non-success status: {}", response.getStatusCode());
            }
        } catch (Exception ex) {
            log.warn("Notification dispatch failed for appointment {}: {}", appointment.getIdAp(), ex.getMessage());
        }
    }
}
