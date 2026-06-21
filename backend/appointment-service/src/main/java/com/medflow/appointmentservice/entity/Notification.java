package com.medflow.appointmentservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, updatable = false)
    private UUID notificationId;

    @Column(nullable = false)
    private UUID recipientId;

    private String recipientRole;
    private String eventType;

    @Column(length = 1000)
    private String message;

    private Long appointmentId;
    private UUID patientId;
    private UUID doctorId;

    private LocalDateTime scheduledAt;
    private LocalDateTime pendingScheduledAt;

    private String status;
    private String pendingStatus;
    private String reason;

    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    public void ensureNotificationId() {
        if (notificationId == null) {
            notificationId = UUID.randomUUID();
        }
    }
}
