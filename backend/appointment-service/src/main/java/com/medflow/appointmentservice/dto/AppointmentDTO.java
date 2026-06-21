package com.medflow.appointmentservice.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;


@Data
public class AppointmentDTO {
    private Long id;
    private Long idAp;
    private UUID idPatient;
    private String patientName;
    private UUID idDoctor;
    private UUID idLabo;
    private String type;
    private String status;
    private String visitType;
    private String meetingUrl;
    private String meetingProvider;
    private boolean canJoin;
    private LocalDateTime joinAvailableAt;
    private LocalDateTime scheduledAt;
    private LocalDateTime createdAt;
    private Integer triageLevel;
    private String aiSummary;
    private LocalDateTime pendingScheduledAt;
    private String pendingStatus;
    private boolean awaitingPatientConfirmation;
    private boolean awaitingDoctorConfirmation;
    private PreconsultationDTO preconsultation;
}