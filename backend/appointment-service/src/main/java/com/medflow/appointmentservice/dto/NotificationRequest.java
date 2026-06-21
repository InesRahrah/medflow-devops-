package com.medflow.appointmentservice.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class NotificationRequest {
    private UUID recipientId;
    private String recipientRole;
    private String eventType;
    private String message;
    private Long appointmentId;
    private UUID patientId;
    private UUID doctorId;
    private LocalDateTime scheduledAt;
    private LocalDateTime pendingScheduledAt;
    private String status;
    private String pendingStatus;
    private String reason;
}
