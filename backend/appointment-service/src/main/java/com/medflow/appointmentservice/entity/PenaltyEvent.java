package com.medflow.appointmentservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
public class PenaltyEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long appointmentId;

    private UUID patientId;

    private UUID doctorId;

    @Enumerated(EnumType.STRING)
    private PenaltyEventType eventType;

    private int scoreDelta;

    private LocalDateTime occurredAt;

    private LocalDateTime createdAt = LocalDateTime.now();

    private boolean waived = false;

    @Column(length = 512)
    private String notes;
}
