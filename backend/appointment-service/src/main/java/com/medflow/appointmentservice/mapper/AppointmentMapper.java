package com.medflow.appointmentservice.mapper;

import com.medflow.appointmentservice.dto.AppointmentDTO;
import com.medflow.appointmentservice.dto.PreconQuestionDTO;
import com.medflow.appointmentservice.dto.PreconsultationDTO;
import com.medflow.appointmentservice.entity.Appointment;
import com.medflow.appointmentservice.entity.PreconQuestion;
import com.medflow.appointmentservice.entity.Preconsultation;
import com.medflow.appointmentservice.entity.VisitType;
import com.medflow.appointmentservice.service.UserProfileLookupService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public class AppointmentMapper {

    private static final int TELEMED_JOIN_BEFORE_START_MINUTES = 10;
    private static final int TELEMED_DEFAULT_DURATION_MINUTES = 30;
    private static final int TELEMED_JOIN_AFTER_END_MINUTES = 30;

    public static AppointmentDTO toDTO(Appointment appointment) {
        return toDTO(appointment, null, null);
    }

    public static AppointmentDTO toDTO(Appointment appointment, UUID currentPatientId) {
        return toDTO(appointment, null, currentPatientId);
    }

    private static AppointmentDTO toDTO(Appointment appointment, UserProfileLookupService lookupService, UUID currentPatientId) {
        if (appointment == null) {
            return null;
        }
        AppointmentDTO dto = new AppointmentDTO();
        dto.setId(appointment.getIdAp());
        dto.setIdAp(appointment.getIdAp());
        dto.setIdPatient(appointment.getIdPatient());
        dto.setIdDoctor(appointment.getIdDoctor());
        dto.setIdLabo(appointment.getIdLabo());
        dto.setType(appointment.getType());
        dto.setStatus(appointment.getStatus());
        dto.setVisitType(appointment.getVisitType() == null ? VisitType.IN_PERSON.name() : appointment.getVisitType().name());
        dto.setMeetingUrl(appointment.getMeetingUrl());
        dto.setMeetingProvider(appointment.getMeetingProvider());
        dto.setScheduledAt(appointment.getScheduledAt());
        dto.setCreatedAt(appointment.getCreatedAt());
        dto.setTriageLevel(appointment.getTriageLevel());
        dto.setAiSummary(appointment.getAiSummary());
        dto.setPendingScheduledAt(appointment.getPendingScheduledAt());
        dto.setPendingStatus(appointment.getPendingStatus());
        dto.setAwaitingPatientConfirmation(appointment.isAwaitingPatientConfirmation());
        dto.setAwaitingDoctorConfirmation(appointment.isAwaitingDoctorConfirmation());
        LocalDateTime joinAvailableAt = computeJoinAvailableAt(appointment);
        dto.setJoinAvailableAt(joinAvailableAt);
        dto.setCanJoin(computeCanJoin(appointment, currentPatientId, LocalDateTime.now()));
        dto.setPreconsultation(toDTO(appointment.getPreconsultation()));
        if (dto != null && lookupService != null && appointment.getIdPatient() != null) {
            dto.setPatientName(lookupService.getDisplayName(appointment.getIdPatient()));
        }
        return dto;
    }

    public static AppointmentDTO toDTO(Appointment appointment, UserProfileLookupService lookupService) {
        return toDTO(appointment, lookupService, null);
    }

    public static AppointmentDTO toDTOWithContext(Appointment appointment, UserProfileLookupService lookupService, UUID currentPatientId) {
        return toDTO(appointment, lookupService, currentPatientId);
    }

    public static List<AppointmentDTO> toDTOList(List<Appointment> appointments, UserProfileLookupService lookupService) {
        return toDTOList(appointments, lookupService, null);
    }

    public static List<AppointmentDTO> toDTOListWithContext(List<Appointment> appointments, UserProfileLookupService lookupService, UUID currentPatientId) {
        return toDTOList(appointments, lookupService, currentPatientId);
    }

    public static List<AppointmentDTO> toDTOList(List<Appointment> appointments, UserProfileLookupService lookupService, UUID currentPatientId) {
        if (appointments == null) {
            return List.of();
        }
        return appointments.stream()
                .map(a -> toDTO(a, lookupService, currentPatientId))
                .collect(Collectors.toList());
    }

    public static PreconsultationDTO toDTO(Preconsultation preconsultation) {
        if (preconsultation == null) {
            return null;
        }
        PreconsultationDTO dto = new PreconsultationDTO();
        dto.setIdP(preconsultation.getIdP());
        dto.setNotes(preconsultation.getNotes());
        dto.setQuestions(preconsultation.getQuestions() != null ?
            preconsultation.getQuestions().stream()
                .map(AppointmentMapper::toDTO)
                .collect(Collectors.toList()) : null);
        return dto;
    }

    public static PreconQuestionDTO toDTO(PreconQuestion preconQuestion) {
        if (preconQuestion == null) {
            return null;
        }
        PreconQuestionDTO dto = new PreconQuestionDTO();
        dto.setId(preconQuestion.getId());
        dto.setOrderIndex(preconQuestion.getOrderIndex());
        dto.setText(preconQuestion.getText());
        dto.setType(preconQuestion.getType() == null ? null : preconQuestion.getType().name());
        dto.setRequired(preconQuestion.getRequired());
        dto.setOptions(preconQuestion.getOptions());
        return dto;
    }

    public static List<AppointmentDTO> toDTOList(List<Appointment> appointments) {
        return toDTOList(appointments, (UUID) null);
    }

    public static List<AppointmentDTO> toDTOList(List<Appointment> appointments, UUID currentPatientId) {
        if (appointments == null) {
            return null;
        }
        return appointments.stream()
            .map(a -> toDTO(a, currentPatientId))
            .collect(Collectors.toList());
    }

    public static LocalDateTime computeJoinAvailableAt(Appointment appointment) {
        if (appointment == null || appointment.getVisitType() != VisitType.TELEMEDICINE || appointment.getScheduledAt() == null) {
            return null;
        }
        return appointment.getScheduledAt().minusMinutes(TELEMED_JOIN_BEFORE_START_MINUTES);
    }

    public static LocalDateTime computeJoinDeadline(Appointment appointment) {
        if (appointment == null || appointment.getVisitType() != VisitType.TELEMEDICINE || appointment.getScheduledAt() == null) {
            return null;
        }
        return appointment.getScheduledAt()
                .plusMinutes(TELEMED_DEFAULT_DURATION_MINUTES)
                .plusMinutes(TELEMED_JOIN_AFTER_END_MINUTES);
    }

    public static boolean computeCanJoin(Appointment appointment, UUID currentPatientId, LocalDateTime now) {
        if (appointment == null || now == null || currentPatientId == null) {
            return false;
        }
        if (appointment.getVisitType() != VisitType.TELEMEDICINE) {
            return false;
        }
        if (appointment.getMeetingUrl() == null || appointment.getMeetingUrl().isBlank()) {
            return false;
        }
        if (!currentPatientId.equals(appointment.getIdPatient())) {
            return false;
        }
        if (appointment.getStatus() == null || !"SCHEDULED".equalsIgnoreCase(appointment.getStatus())) {
            return false;
        }
        LocalDateTime joinStart = computeJoinAvailableAt(appointment);
        LocalDateTime joinEnd = computeJoinDeadline(appointment);
        return joinStart != null && joinEnd != null && !now.isBefore(joinStart) && !now.isAfter(joinEnd);
    }
}