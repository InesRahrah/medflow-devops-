package com.medflow.appointmentservice.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class NotificationResponse {
    private Long id;
    private UUID notificationId;
    private UUID recipientId;
    private String recipientRole;
    private String eventType;
    private String message;
    private Long appointmentId;
    private UUID patientId;
    private String patientName;
    private UUID doctorId;
    private String doctorName;
    private String doctorSpecialty;
    private UUID actorId;
    private String actorRole;
    private String actorName;
    private LocalDateTime scheduledAt;
    private LocalDateTime pendingScheduledAt;
    private String status;
    private String pendingStatus;
    private String reason;
    private LocalDateTime createdAt;
}
