package com.medflow.appointmentservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
public class Appointment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idAp;

    private String type;
    private UUID idPatient;
    private UUID idDoctor;
    private UUID idLabo;
    private String status;
    private Integer triageLevel;
    @Enumerated(EnumType.STRING)
    private VisitType visitType = VisitType.IN_PERSON;
    private String meetingUrl;
    private String meetingProvider;
    private LocalDateTime scheduledAt;
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(columnDefinition = "TEXT")
    private String aiSummary;

    // Pending changes for patient confirmation
    private LocalDateTime pendingScheduledAt;
    private String pendingStatus;
    private boolean awaitingPatientConfirmation = false;
    private boolean awaitingDoctorConfirmation = false;

    // One appointment -> one preconsultation response
    @OneToOne(mappedBy = "appointment", cascade = CascadeType.ALL)
    private Preconsultation preconsultation;
}
