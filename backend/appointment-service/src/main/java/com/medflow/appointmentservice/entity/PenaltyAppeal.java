package com.medflow.appointmentservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
public class PenaltyAppeal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long penaltyEventId;

    private UUID patientId;

    @Column(length = 1000)
    private String explanation;

    @Enumerated(EnumType.STRING)
    private AppealStatus status = AppealStatus.PENDING;

    @Column(length = 512)
    private String adminNote;

    private LocalDateTime submittedAt = LocalDateTime.now();

    private LocalDateTime reviewedAt;
}
