package com.medflow.appointmentservice.service;

import com.medflow.appointmentservice.dto.NotificationRequest;
import com.medflow.appointmentservice.dto.NotificationResponse;
import com.medflow.appointmentservice.entity.Notification;
import com.medflow.appointmentservice.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class NotificationService {

    private static final DateTimeFormatter NOTIFICATION_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("MMM d, h:mm a", Locale.ENGLISH);

    private final NotificationRepository notificationRepository;
    private final UserProfileLookupService userProfileLookupService;

    public NotificationService(NotificationRepository notificationRepository,
                               UserProfileLookupService userProfileLookupService) {
        this.notificationRepository = notificationRepository;
        this.userProfileLookupService = userProfileLookupService;
    }

    public NotificationResponse create(NotificationRequest request) {
        UserProfileLookupService.UserProfile patientProfile = userProfileLookupService.getProfile(request.getPatientId());
        UserProfileLookupService.UserProfile doctorProfile = userProfileLookupService.getProfile(request.getDoctorId());
        String normalizedEventType = normalizeEventType(request.getEventType());

        Notification notification = new Notification();
        notification.setRecipientId(request.getRecipientId());
        notification.setRecipientRole(request.getRecipientRole());
        notification.setEventType(normalizedEventType);
        notification.setMessage(buildPersonalizedMessage(request, normalizedEventType, patientProfile, doctorProfile));
        notification.setAppointmentId(request.getAppointmentId());
        notification.setPatientId(request.getPatientId());
        notification.setDoctorId(request.getDoctorId());
        notification.setScheduledAt(request.getScheduledAt());
        notification.setPendingScheduledAt(request.getPendingScheduledAt());
        notification.setStatus(normalizeWorkflowStatus(normalizedEventType, request.getStatus(), request.getPendingStatus()));
        notification.setPendingStatus(request.getPendingStatus());
        notification.setReason(request.getReason());

        Notification saved = notificationRepository.save(notification);
        return toResponse(saved);
    }

    public List<NotificationResponse> getByRecipient(UUID userId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public int cleanupLegacyUnknownUserMessages() {
        Map<Long, Notification> candidateMap = new LinkedHashMap<>();
        for (Notification notification : notificationRepository.findByMessageContainingIgnoreCase("unknown user")) {
            candidateMap.put(notification.getId(), notification);
        }
        for (Notification notification : notificationRepository.findByMessageContainingIgnoreCase("unkown user")) {
            candidateMap.put(notification.getId(), notification);
        }
        for (Notification notification : notificationRepository.findByNotificationIdIsNull()) {
            candidateMap.put(notification.getId(), notification);
        }

        List<Notification> candidates = new ArrayList<>(candidateMap.values());

        int updated = 0;
        for (Notification notification : candidates) {
            if (notification.getNotificationId() == null) {
                notification.setNotificationId(UUID.randomUUID());
                updated++;
            }

            UUID actorId = resolveActorId(notification);
            UserProfileLookupService.UserProfile actorProfile = userProfileLookupService.getProfile(actorId);
            String actorRole = resolveActorRole(notification, actorId, actorProfile);
            String actorName = firstNonBlank(actorProfile.getDisplayName(), fallbackActorName(actorRole));

            String sanitized = sanitizeLegacyMessage(notification.getMessage(), actorName);
            if (sanitized != null && !sanitized.equals(notification.getMessage())) {
                notification.setMessage(sanitized);
                updated++;
            }
        }

        if (updated > 0) {
            notificationRepository.saveAll(candidates);
        }

        return updated;
    }

    private NotificationResponse toResponse(Notification notification) {
        UserProfileLookupService.UserProfile patientProfile = userProfileLookupService.getProfile(notification.getPatientId());
        UserProfileLookupService.UserProfile doctorProfile = userProfileLookupService.getProfile(notification.getDoctorId());
        UUID actorId = resolveActorId(notification);
        UserProfileLookupService.UserProfile actorProfile = userProfileLookupService.getProfile(actorId);
        String actorRole = resolveActorRole(notification, actorId, actorProfile);

        NotificationResponse response = new NotificationResponse();
        response.setId(notification.getId());
        response.setNotificationId(notification.getNotificationId());
        response.setRecipientId(notification.getRecipientId());
        response.setRecipientRole(notification.getRecipientRole());
        String normalizedEventType = normalizeEventType(notification.getEventType());
        response.setEventType(normalizedEventType);
        String resolvedActorName = firstNonBlank(actorProfile.getDisplayName(), fallbackActorName(actorRole));
        response.setMessage(sanitizeLegacyMessage(notification.getMessage(), resolvedActorName));
        response.setAppointmentId(notification.getAppointmentId());
        response.setPatientId(notification.getPatientId());
        response.setPatientName(firstNonBlank(patientProfile.getDisplayName(), "Patient"));
        response.setDoctorId(notification.getDoctorId());
        response.setDoctorName(firstNonBlank(doctorProfile.getDisplayName(), "Doctor"));

        boolean isSystemNotification = "PENALTY_WARNING".equalsIgnoreCase(normalizedEventType)
                || "PENALTY_TIER_CHANGE".equalsIgnoreCase(normalizedEventType)
                || "APPEAL_SUBMITTED".equalsIgnoreCase(normalizedEventType)
                || "APPEAL_APPROVED".equalsIgnoreCase(normalizedEventType)
                || "APPEAL_REJECTED".equalsIgnoreCase(normalizedEventType);
        response.setDoctorSpecialty(isSystemNotification ? null : firstNonBlank(doctorProfile.getSpecialization(), "General Medicine"));
        response.setActorId(isSystemNotification ? null : actorId);
        response.setActorRole(isSystemNotification ? "SYSTEM" : actorRole);
        response.setActorName(isSystemNotification ? "MedFlow Team" : resolvedActorName);
        response.setScheduledAt(notification.getScheduledAt());
        response.setPendingScheduledAt(notification.getPendingScheduledAt());
        response.setStatus(normalizeWorkflowStatus(normalizedEventType, notification.getStatus(), notification.getPendingStatus()));
        response.setPendingStatus(notification.getPendingStatus());
        response.setReason(notification.getReason());
        response.setCreatedAt(notification.getCreatedAt());
        return response;
    }

    private UUID resolveActorId(Notification notification) {
        if (notification.getRecipientId() != null) {
            if (notification.getRecipientId().equals(notification.getDoctorId())) {
                return firstNonNull(notification.getPatientId(), notification.getDoctorId());
            }
            if (notification.getRecipientId().equals(notification.getPatientId())) {
                return firstNonNull(notification.getDoctorId(), notification.getPatientId());
            }
        }

        if ("PATIENT".equalsIgnoreCase(notification.getRecipientRole())) {
            return firstNonNull(notification.getDoctorId(), notification.getPatientId());
        }

        if ("DOCTOR".equalsIgnoreCase(notification.getRecipientRole())) {
            return firstNonNull(notification.getPatientId(), notification.getDoctorId());
        }

        return firstNonNull(notification.getPatientId(), notification.getDoctorId());
    }

    private String resolveActorRole(Notification notification, UUID actorId, UserProfileLookupService.UserProfile actorProfile) {
        if (actorProfile.getRole() != null && !actorProfile.getRole().isBlank()) {
            return actorProfile.getRole();
        }

        if (actorId != null && actorId.equals(notification.getPatientId())) {
            return "PATIENT";
        }
        if (actorId != null && actorId.equals(notification.getDoctorId())) {
            return "DOCTOR";
        }

        if ("PATIENT".equalsIgnoreCase(notification.getRecipientRole())) {
            return "DOCTOR";
        }
        if ("DOCTOR".equalsIgnoreCase(notification.getRecipientRole())) {
            return "PATIENT";
        }

        // If identity cannot be inferred, default to PATIENT to avoid UNKNOWN roles in API contract.
        return "PATIENT";
    }

    private String normalizeEventType(String rawEventType) {
        if (rawEventType == null || rawEventType.isBlank()) {
            return "PATIENT_POSTPONE_REQUEST";
        }

        return switch (rawEventType.trim().toUpperCase()) {
            case "PATIENT_CANCEL_REQUEST", "CANCELLATION_REQUESTED_BY_PATIENT" -> "PATIENT_CANCEL_REQUEST";
            case "DOCTOR_CANCEL_REQUEST", "CANCELLATION_REQUESTED_BY_DOCTOR" -> "DOCTOR_CANCEL_REQUEST";
            case "PATIENT_POSTPONE_REQUEST", "POSTPONE_REQUESTED_BY_PATIENT" -> "PATIENT_POSTPONE_REQUEST";
            case "DOCTOR_POSTPONE_REQUEST", "POSTPONE_REQUESTED_BY_DOCTOR" -> "DOCTOR_POSTPONE_REQUEST";
            case "DOCTOR_COUNTER_PROPOSAL", "POSTPONE_REJECTED_BY_DOCTOR_WITH_ALTERNATIVE" -> "DOCTOR_COUNTER_PROPOSAL";
            case "PATIENT_ACCEPTED_POSTPONE", "CHANGE_CONFIRMED_BY_PATIENT" -> "PATIENT_ACCEPTED_POSTPONE";
            case "PATIENT_REJECTED_POSTPONE" -> "PATIENT_REJECTED_POSTPONE";
            case "PATIENT_REJECTED_CANCELLATION", "CANCELLATION_REJECTED_BY_PATIENT" -> "PATIENT_REJECTED_CANCELLATION";
            case "DOCTOR_ACCEPTED_POSTPONE", "POSTPONE_CONFIRMED_BY_DOCTOR", "CHANGE_CONFIRMED_BY_DOCTOR" -> "DOCTOR_ACCEPTED_POSTPONE";
            case "DOCTOR_CONFIRMED_CANCELLATION", "CANCELLATION_CONFIRMED_BY_DOCTOR" -> "DOCTOR_CONFIRMED_CANCELLATION";
            case "PATIENT_CONFIRMED_CANCELLATION", "CANCELLATION_CONFIRMED_BY_PATIENT" -> "PATIENT_CONFIRMED_CANCELLATION";
            default -> rawEventType.trim().toUpperCase();
        };
    }

    private String normalizeWorkflowStatus(String eventType, String status, String pendingStatus) {
        if (eventType == null) {
            return "PENDING";
        }

        String normalized = eventType.toUpperCase();
        if (normalized.contains("COUNTER_PROPOSAL")) {
            return "COUNTER_PROPOSED";
        }
        if (normalized.contains("REJECT")) {
            return "REJECTED";
        }
        if (normalized.contains("CONFIRMED") || normalized.contains("ACCEPTED")) {
            return "ACCEPTED";
        }
        if (pendingStatus != null && !pendingStatus.isBlank()) {
            return "PENDING";
        }
        if (status != null && !status.isBlank() && "CANCELLED".equalsIgnoreCase(status)) {
            return "ACCEPTED";
        }
        return "PENDING";
    }

    private String buildPersonalizedMessage(NotificationRequest request,
                                            String eventType,
                                            UserProfileLookupService.UserProfile patientProfile,
                                            UserProfileLookupService.UserProfile doctorProfile) {
        String patientName = firstNonBlank(patientProfile.getDisplayName(), "Patient");
        String doctorName = firstNonBlank(doctorProfile.getDisplayName(), "Doctor");
        String doctorDisplay = doctorName.startsWith("Dr.") ? doctorName : "Dr. " + doctorName;
        String scheduledAt = formatDateTime(request.getScheduledAt());
        String pendingScheduledAt = formatDateTime(request.getPendingScheduledAt());

        String generated = switch (eventType) {
            case "PATIENT_CANCEL_REQUEST" -> patientName + " requested to cancel the appointment scheduled for " + scheduledAt + ". Please confirm.";
            case "DOCTOR_CANCEL_REQUEST" -> doctorDisplay + " requested to cancel your appointment scheduled for " + scheduledAt + ". Please confirm.";
            case "PATIENT_POSTPONE_REQUEST" -> {
                String msg = patientName + " requested to reschedule the appointment from " + scheduledAt + " to " + pendingScheduledAt + ".";
                if (request.getReason() != null && !request.getReason().isBlank()) {
                    msg += " Reason: " + request.getReason() + ".";
                }
                yield msg;
            }
            case "DOCTOR_POSTPONE_REQUEST" -> doctorDisplay + " proposed to reschedule your appointment to " + pendingScheduledAt + ".";
            case "DOCTOR_COUNTER_PROPOSAL" -> doctorDisplay + " rejected your requested time (" + scheduledAt + ") and suggested " + pendingScheduledAt + ".";
            case "PATIENT_ACCEPTED_POSTPONE" -> patientName + " accepted the postponement proposal.";
            case "PATIENT_REJECTED_POSTPONE" -> patientName + " rejected the postponement proposal.";
            case "PATIENT_REJECTED_CANCELLATION" -> patientName + " rejected the cancellation request.";
            case "DOCTOR_ACCEPTED_POSTPONE" -> doctorDisplay + " accepted the postponement request.";
            case "DOCTOR_CONFIRMED_CANCELLATION" -> doctorDisplay + " confirmed appointment cancellation.";
            case "PATIENT_CONFIRMED_CANCELLATION" -> patientName + " confirmed appointment cancellation.";
            default -> request.getMessage();
        };

        if (generated != null && !generated.isBlank()) {
            return generated;
        }

        if (request.getMessage() == null || request.getMessage().isBlank()) {
            return "You have a new appointment notification.";
        }

        return request.getMessage();
    }

    private String formatDateTime(LocalDateTime dateTime) {
        if (dateTime == null) {
            return "an updated time";
        }
        return dateTime.format(NOTIFICATION_TIME_FORMATTER);
    }

    private <T> T firstNonNull(T first, T second) {
        return first != null ? first : second;
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        return second;
    }

    private String fallbackActorName(String actorRole) {
        if ("DOCTOR".equalsIgnoreCase(actorRole)) {
            return "Doctor";
        }
        return "Patient";
    }

    private String sanitizeLegacyMessage(String message, String actorName) {
        if (message == null || message.isBlank()) {
            return message;
        }

        String name = firstNonBlank(actorName, "Patient");
        return message
                .replace("Unknown user", name)
                .replace("unknown user", name)
                .replace("UNKOWN USER", name)
                .replace("unkown user", name);
    }
}
