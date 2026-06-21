package com.medflow.appointmentservice.service;

import com.medflow.appointmentservice.entity.Appointment;
import com.medflow.appointmentservice.exception.SlotAlreadyBookedException;
import com.medflow.appointmentservice.repository.AppointmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.medflow.appointmentservice.dto.DoctorPatientSummaryDTO;
import com.medflow.appointmentservice.entity.VisitType;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class AppointmentService {

    private static final String STATUS_PENDING_DOCTOR_CONFIRMATION = "PENDING_DOCTOR_CONFIRMATION";
    private static final String STATUS_PENDING_PATIENT_CONFIRMATION = "PENDING_PATIENT_CONFIRMATION";
    private static final String STATUS_SCHEDULED = "SCHEDULED";
    private static final String STATUS_ATTENDED = "ATTENDED";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final String STATUS_LATE_CANCEL = "LATE_CANCEL";
    private static final String STATUS_REJECTED_BY_DOCTOR = "REJECTED_BY_DOCTOR";
    private static final String STATUS_REJECTED_BY_PATIENT = "REJECTED_BY_PATIENT";
    private static final DateTimeFormatter APPOINTMENT_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("MMM d, yyyy 'at' h:mm a", Locale.ENGLISH);

        @Value("${telemed.provider:ZOOM}")
        private String telemedProvider;

        @Value("${telemed.base-url:https://meet.jit.si}")
        private String telemedBaseUrl;

        @Value("${zoom.use-doctor-host:false}")
        private boolean zoomUseDoctorHost;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private AppointmentNotificationService appointmentNotificationService;

    @Autowired
    private UserProfileLookupService userProfileLookupService;

    @Autowired
    private ZoomMeetingService zoomMeetingService;

    @Autowired
    private PatientPenaltyService patientPenaltyService;

    @Transactional
    public Appointment createAppointment(Appointment appointment) {
        return createAppointment(appointment, "PATIENT");
    }

    @Transactional
    public Appointment createAppointment(Appointment appointment, String createdByRole) {
        boolean isDoctor = "DOCTOR".equalsIgnoreCase(createdByRole);

        if (!isDoctor) {
            patientPenaltyService.enforceBookingPolicyForPatient(appointment.getIdPatient(), appointment.getScheduledAt());
        }

        applyVisitTypeDefaultsAndValidation(appointment);
        appointment.setCreatedAt(LocalDateTime.now());

        // --- Double-booking prevention (pessimistic lock) ---
        if (appointment.getIdDoctor() != null && appointment.getScheduledAt() != null) {
            LocalDateTime normalizedTime = appointment.getScheduledAt().withSecond(0).withNano(0);
            appointment.setScheduledAt(normalizedTime);
            appointmentRepository.findActiveSlotForUpdate(appointment.getIdDoctor(), normalizedTime)
                    .ifPresent(existing -> {
                        throw new SlotAlreadyBookedException(
                                "This time slot is no longer available. Another patient has already booked this slot. Please select a different time.");
                    });

            // --- Patient same-slot conflict prevention ---
            if (appointment.getIdPatient() != null) {
                appointmentRepository.findActivePatientSlot(appointment.getIdPatient(), normalizedTime)
                        .ifPresent(existing -> {
                            throw new SlotAlreadyBookedException(
                                    "You already have an appointment scheduled at this time. Please choose a different time slot.");
                        });
            }
        }

        if (isDoctor) {
            appointment.setStatus(STATUS_PENDING_PATIENT_CONFIRMATION);
            appointment.setAwaitingPatientConfirmation(true);
            appointment.setAwaitingDoctorConfirmation(false);
        } else {
            appointment.setStatus(STATUS_PENDING_DOCTOR_CONFIRMATION);
            appointment.setAwaitingDoctorConfirmation(true);
            appointment.setAwaitingPatientConfirmation(false);
        }
        appointment.setPendingScheduledAt(null);
        appointment.setPendingStatus(null);

        Appointment saved = appointmentRepository.save(appointment);

        if (isDoctor) {
            notifyPatient(
                    saved,
                    "APPOINTMENT_CREATED_BY_DOCTOR",
                    buildAppointmentConfirmationMessage(saved),
                    null
            );
        } else {
            notifyDoctor(
                    saved,
                    "APPOINTMENT_REQUESTED_BY_PATIENT",
                    buildInitialAppointmentRequestMessage(saved),
                    null
            );
        }
        return saved;
    }

    private void applyVisitTypeDefaultsAndValidation(Appointment appointment) {
        if (appointment.getVisitType() == null) {
            appointment.setVisitType(VisitType.IN_PERSON);
        }

        if (appointment.getMeetingUrl() != null && appointment.getMeetingUrl().isBlank()) {
            appointment.setMeetingUrl(null);
        }
    }

    private void ensureTelemedicineMeetingLink(Appointment appointment) {
        if (appointment == null || appointment.getVisitType() != VisitType.TELEMEDICINE) {
            return;
        }

        if (appointment.getMeetingUrl() == null || appointment.getMeetingUrl().isBlank()) {
            String provider = telemedProvider == null || telemedProvider.isBlank()
                    ? "ZOOM"
                    : telemedProvider.trim().toUpperCase(Locale.ROOT);

            if ("ZOOM".equals(provider)) {
                try {
                    String zoomUserIdOverride = null;
                    if (zoomUseDoctorHost && appointment.getIdDoctor() != null) {
                        UserProfileLookupService.UserProfile doctorProfile = userProfileLookupService.getProfile(appointment.getIdDoctor());
                        if (doctorProfile != null && doctorProfile.getEmail() != null && !doctorProfile.getEmail().isBlank()) {
                            zoomUserIdOverride = doctorProfile.getEmail();
                        }
                    }

                    ZoomMeetingService.ZoomMeetingDetails details = zoomMeetingService.createMeetingForAppointment(appointment, zoomUserIdOverride);
                    appointment.setMeetingUrl(details.joinUrl());
                } catch (Exception ex) {
                    throw new IllegalArgumentException(
                            "Unable to create Zoom meeting. Please verify zoom.account-id, zoom.client-id, zoom.client-secret, Zoom app permissions, and that the doctor has a Zoom user (email) under your Zoom account.",
                            ex
                    );
                }
            } else {
                String generatedToken = UUID.randomUUID().toString();
                appointment.setMeetingUrl(buildGeneratedTelemedUrl(generatedToken));
            }
        }

        if (appointment.getMeetingProvider() == null || appointment.getMeetingProvider().isBlank()) {
            appointment.setMeetingProvider(telemedProvider == null || telemedProvider.isBlank()
                    ? "ZOOM"
                    : telemedProvider.trim().toUpperCase(Locale.ROOT));
        }
    }

    private String buildGeneratedTelemedUrl(String generatedToken) {
        String providerBaseUrl = telemedBaseUrl == null || telemedBaseUrl.isBlank()
                ? "https://meet.jit.si"
                : telemedBaseUrl.trim();
        String normalizedBaseUrl = providerBaseUrl.endsWith("/")
                ? providerBaseUrl.substring(0, providerBaseUrl.length() - 1)
                : providerBaseUrl;

        // Non-Zoom fallback provider room links.
        return normalizedBaseUrl + "/medflow-" + generatedToken;
    }

    @Transactional
    public Optional<Appointment> respondToPatientRequest(Long appointmentId, boolean accept) {
        if (appointmentId == null) {
            return Optional.empty();
        }

        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isEmpty()) {
            return Optional.empty();
        }

        Appointment appointment = optionalAppointment.get();
        if (!STATUS_PENDING_PATIENT_CONFIRMATION.equalsIgnoreCase(appointment.getStatus())) {
            return Optional.empty();
        }

        appointment.setAwaitingPatientConfirmation(false);
        appointment.setAwaitingDoctorConfirmation(false);
        appointment.setPendingScheduledAt(null);
        appointment.setPendingStatus(null);

        if (accept) {
            ensureTelemedicineMeetingLink(appointment);
            appointment.setStatus(STATUS_SCHEDULED);
            notifyDoctor(
                    appointment,
                    "APPOINTMENT_CONFIRMED_BY_PATIENT",
                    "Patient confirmed your appointment scheduled for " + formatDateTime(appointment.getScheduledAt()) + ".",
                    null
            );
        } else {
            appointment.setStatus(STATUS_REJECTED_BY_PATIENT);
            notifyDoctor(
                    appointment,
                    "APPOINTMENT_DECLINED_BY_PATIENT",
                    "Patient declined your appointment request.",
                    null
            );
        }

        return Optional.of(appointmentRepository.save(appointment));
    }

    @Transactional
    public Optional<Appointment> respondToInitialRequestByDoctor(Long appointmentId, boolean accept) {
        if (appointmentId == null) {
            return Optional.empty();
        }

        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isEmpty()) {
            return Optional.empty();
        }

        Appointment appointment = optionalAppointment.get();
        if (!STATUS_PENDING_DOCTOR_CONFIRMATION.equalsIgnoreCase(appointment.getStatus())) {
            return Optional.empty();
        }

        appointment.setAwaitingDoctorConfirmation(false);
        appointment.setAwaitingPatientConfirmation(false);
        appointment.setPendingScheduledAt(null);
        appointment.setPendingStatus(null);

        if (accept) {
            ensureTelemedicineMeetingLink(appointment);
            appointment.setStatus(STATUS_SCHEDULED);
            notifyPatient(
                    appointment,
                    "APPOINTMENT_REQUEST_ACCEPTED_BY_DOCTOR",
                    "Doctor accepted your appointment request. It has been added to the schedule.",
                    null
            );
        } else {
            appointment.setStatus(STATUS_REJECTED_BY_DOCTOR);
            notifyPatient(
                    appointment,
                    "APPOINTMENT_REQUEST_REJECTED_BY_DOCTOR",
                    "Doctor refused your appointment request.",
                    null
            );
        }

        return Optional.of(appointmentRepository.save(appointment));
    }

    @Transactional
    public Optional<Appointment> ensureTelemedicineMeetingLinkForAcceptedAppointment(Long appointmentId) {
        if (appointmentId == null) {
            return Optional.empty();
        }

        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isEmpty()) {
            return Optional.empty();
        }

        Appointment appointment = optionalAppointment.get();
        if (appointment.getVisitType() != VisitType.TELEMEDICINE) {
            return Optional.of(appointment);
        }

        if (appointment.getStatus() == null || !STATUS_SCHEDULED.equalsIgnoreCase(appointment.getStatus())) {
            return Optional.of(appointment);
        }

        if (appointment.getMeetingUrl() != null && !appointment.getMeetingUrl().isBlank()) {
            if (appointment.getMeetingProvider() == null || appointment.getMeetingProvider().isBlank()) {
                appointment.setMeetingProvider(telemedProvider == null || telemedProvider.isBlank()
                    ? "ZOOM"
                        : telemedProvider.trim().toUpperCase(Locale.ROOT));
                return Optional.of(appointmentRepository.save(appointment));
            }
            return Optional.of(appointment);
        }

        ensureTelemedicineMeetingLink(appointment);
        return Optional.of(appointmentRepository.save(appointment));
    }

    public List<Appointment> getAllAppointments() {
        return appointmentRepository.findAll();
    }

    public List<Appointment> getAppointmentsByPatientId(UUID patientId) {
        if (patientId == null) {
            return List.of();
        }
        return appointmentRepository.findByIdPatient(patientId);
    }

    public List<Appointment> getScheduledAppointmentsByDoctorId(UUID doctorId) {
        if (doctorId == null) {
            return List.of();
        }
        return appointmentRepository.findByIdDoctorAndStatusInOrderByScheduledAtAsc(
                doctorId, List.of(STATUS_SCHEDULED, STATUS_ATTENDED, "PENDING_PATIENT_CONFIRMATION", "PENDING_DOCTOR_CONFIRMATION"));
    }

    public List<DoctorPatientSummaryDTO> getDoctorPatients(UUID doctorId) {
        if (doctorId == null) {
            return List.of();
        }
        List<Object[]> rows = appointmentRepository.findPatientSummariesByDoctorId(doctorId);
        List<DoctorPatientSummaryDTO> result = new ArrayList<>();
        for (Object[] row : rows) {
            UUID patientId = (UUID) row[0];
            LocalDateTime lastVisit = (LocalDateTime) row[1];
            long total = ((Number) row[2]).longValue();
            String name = userProfileLookupService.getDisplayName(patientId);
            result.add(new DoctorPatientSummaryDTO(patientId, name, lastVisit, total));
        }
        return result;
    }

    public Optional<Appointment> getAppointmentById(Long appointmentId) {
        if (appointmentId != null) {
            return appointmentRepository.findById(appointmentId);
        }
        return Optional.empty();
    }

    public boolean isFirstAppointment(UUID patientId, UUID doctorId) {
        if (patientId == null) {
            return false;
        }
        if (doctorId != null) {
            return !appointmentRepository.existsByIdPatientAndIdDoctor(patientId, doctorId);
        }
        return !appointmentRepository.existsByIdPatient(patientId);
    }

    @Transactional
    public void deleteAppointment(Long appointmentId) {
        throw new UnsupportedOperationException("Direct delete is disabled. Use cancellation request flow.");
    }

    @Transactional
    public Optional<Appointment> requestCancellation(Long appointmentId, String requestedBy) {
        if (appointmentId == null || requestedBy == null) {
            return Optional.empty();
        }

        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isEmpty()) {
            return Optional.empty();
        }

        Appointment appointment = optionalAppointment.get();
        String normalized = requestedBy.trim().toUpperCase();
        appointment.setPendingStatus(STATUS_CANCELLED);

        if ("DOCTOR".equals(normalized)) {
            appointment.setAwaitingPatientConfirmation(true);
            appointment.setAwaitingDoctorConfirmation(false);
            notifyPatient(appointment, "CANCELLATION_REQUESTED_BY_DOCTOR", "Doctor requested appointment cancellation. Please confirm.", null);
            return Optional.of(appointmentRepository.save(appointment));
        }

        if ("PATIENT".equals(normalized)) {
            appointment.setAwaitingDoctorConfirmation(true);
            appointment.setAwaitingPatientConfirmation(false);
            notifyDoctor(appointment, "CANCELLATION_REQUESTED_BY_PATIENT", "Patient requested appointment cancellation. Please confirm.", null);
            return Optional.of(appointmentRepository.save(appointment));
        }

        return Optional.empty();
    }

    @Transactional
    public Optional<Appointment> confirmCancellationByPatient(Long appointmentId) {
        if (appointmentId == null) {
            return Optional.empty();
        }

        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isPresent()) {
            Appointment appointment = optionalAppointment.get();
            if (appointment.isAwaitingPatientConfirmation() && "CANCELLED".equalsIgnoreCase(appointment.getPendingStatus())) {
                appointment.setStatus(STATUS_CANCELLED);
                appointment.setPendingStatus(null);
                appointment.setAwaitingPatientConfirmation(false);
                appointment.setAwaitingDoctorConfirmation(false);
                appointment.setPendingScheduledAt(null);
                notifyDoctor(appointment, "CANCELLATION_CONFIRMED_BY_PATIENT", "Patient confirmed cancellation request.", null);
                return Optional.of(appointmentRepository.save(appointment));
            }
        }
        return Optional.empty();
    }

    @Transactional
    public Optional<Appointment> confirmCancellationByDoctor(Long appointmentId) {
        if (appointmentId == null) {
            return Optional.empty();
        }

        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isPresent()) {
            Appointment appointment = optionalAppointment.get();
            if (appointment.isAwaitingDoctorConfirmation() && "CANCELLED".equalsIgnoreCase(appointment.getPendingStatus())) {
                boolean lateCancel = patientPenaltyService.isLateCancellation(appointment);
                appointment.setStatus(lateCancel ? STATUS_LATE_CANCEL : STATUS_CANCELLED);
                appointment.setPendingStatus(null);
                appointment.setAwaitingDoctorConfirmation(false);
                appointment.setAwaitingPatientConfirmation(false);
                appointment.setPendingScheduledAt(null);
                if (lateCancel) {
                    patientPenaltyService.recordLateCancellation(appointment);
                }
                notifyPatient(appointment, "CANCELLATION_CONFIRMED_BY_DOCTOR", "Doctor confirmed cancellation request.", null);
                return Optional.of(appointmentRepository.save(appointment));
            }
        }
        return Optional.empty();
    }

    @Transactional
    public Optional<Appointment> requestUpdateStatus(Long appointmentId, String newStatus) {
        if (appointmentId == null) {
            return Optional.empty();
        }
        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isPresent()) {
            Appointment appointment = optionalAppointment.get();
            appointment.setPendingStatus(newStatus);
            appointment.setAwaitingPatientConfirmation(true);
            notifyPatient(appointment, "STATUS_CHANGE_REQUESTED_BY_DOCTOR", "Doctor requested a status change. Please confirm.", null);
            return Optional.of(appointmentRepository.save(appointment));
        }
        return Optional.empty();
    }

    @Transactional
    public Optional<Appointment> requestPostponeAppointment(Long appointmentId, LocalDateTime newScheduledAt) {
        if (appointmentId == null) {
            return Optional.empty();
        }
        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isPresent()) {
            Appointment appointment = optionalAppointment.get();
            appointment.setPendingScheduledAt(newScheduledAt);
            appointment.setAwaitingPatientConfirmation(true);
            appointment.setAwaitingDoctorConfirmation(false);
            notifyPatient(appointment, "POSTPONE_REQUESTED_BY_DOCTOR", "Doctor requested to postpone this appointment. Please confirm.", null);
            return Optional.of(appointmentRepository.save(appointment));
        }
        return Optional.empty();
    }

    @Transactional
    public Optional<Appointment> requestPatientPostponeAppointment(Long appointmentId, LocalDateTime newScheduledAt, String reason, String updatedAiSummary) {
        if (appointmentId == null) {
            return Optional.empty();
        }
        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isPresent()) {
            Appointment appointment = optionalAppointment.get();
            appointment.setPendingScheduledAt(newScheduledAt);
            appointment.setAwaitingDoctorConfirmation(true);
            appointment.setAwaitingPatientConfirmation(false);
            if (updatedAiSummary != null && !updatedAiSummary.isBlank()) {
                appointment.setAiSummary(updatedAiSummary);
            }
            String notifMsg = "Patient requested to postpone this appointment.";
            if (reason != null && !reason.isBlank()) {
                notifMsg += " Reason: " + reason + ".";
            }
            notifMsg += " Please confirm.";
            notifyDoctor(appointment, "POSTPONE_REQUESTED_BY_PATIENT", notifMsg, reason);
            return Optional.of(appointmentRepository.save(appointment));
        }
        return Optional.empty();
    }

    @Transactional
    public Optional<Appointment> rejectPatientPostponeByDoctor(Long appointmentId, LocalDateTime alternativeScheduledAt) {
        if (appointmentId == null || alternativeScheduledAt == null) {
            return Optional.empty();
        }
        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isPresent()) {
            Appointment appointment = optionalAppointment.get();
            if (appointment.isAwaitingDoctorConfirmation() && appointment.getPendingScheduledAt() != null) {
                appointment.setPendingScheduledAt(alternativeScheduledAt);
                appointment.setAwaitingDoctorConfirmation(false);
                appointment.setAwaitingPatientConfirmation(true);
                notifyPatient(
                        appointment,
                        "POSTPONE_REJECTED_BY_DOCTOR_WITH_ALTERNATIVE",
                        "Doctor rejected your postpone request and proposed an alternative time. Please confirm or cancel.",
                        null
                );
                return Optional.of(appointmentRepository.save(appointment));
            }
        }
        return Optional.empty();
    }

    @Transactional
    public Optional<Appointment> confirmPatientPostponeByDoctor(Long appointmentId) {
        if (appointmentId == null) {
            return Optional.empty();
        }
        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isPresent()) {
            Appointment appointment = optionalAppointment.get();
            if (appointment.isAwaitingDoctorConfirmation()) {
                boolean changed = false;
                boolean hadPendingScheduledAt = appointment.getPendingScheduledAt() != null;
                boolean hadPendingStatus = appointment.getPendingStatus() != null;

                if (appointment.getPendingScheduledAt() != null) {
                    // Check slot availability before applying the reschedule
                    LocalDateTime newTime = appointment.getPendingScheduledAt().withSecond(0).withNano(0);
                    appointmentRepository.findActiveSlotForUpdate(appointment.getIdDoctor(), newTime)
                            .filter(existing -> !existing.getIdAp().equals(appointment.getIdAp()))
                            .ifPresent(existing -> {
                                throw new SlotAlreadyBookedException(
                                        "This time slot is no longer available. Another patient has already booked this slot. Please select a different time.");
                            });
                    appointment.setScheduledAt(newTime);
                    appointment.setPendingScheduledAt(null);
                    changed = true;
                }

                if (appointment.getPendingStatus() != null) {
                    appointment.setStatus(appointment.getPendingStatus());
                    if ("CANCELLED".equalsIgnoreCase(appointment.getPendingStatus())) {
                        appointment.setPendingScheduledAt(null);
                    }
                    appointment.setPendingStatus(null);
                    changed = true;
                }

                if (changed) {
                    appointment.setAwaitingDoctorConfirmation(false);
                    appointment.setAwaitingPatientConfirmation(false);

                    if ("CANCELLED".equalsIgnoreCase(appointment.getStatus())) {
                        notifyPatient(appointment, "CANCELLATION_CONFIRMED_BY_DOCTOR", "Doctor confirmed cancellation request.", null);
                    } else if (hadPendingScheduledAt && !hadPendingStatus) {
                        notifyPatient(appointment, "POSTPONE_CONFIRMED_BY_DOCTOR", "Doctor confirmed your postpone request.", null);
                    } else {
                        notifyPatient(appointment, "CHANGE_CONFIRMED_BY_DOCTOR", "Doctor confirmed your pending request.", null);
                    }

                    return Optional.of(appointmentRepository.save(appointment));
                }
            }
        }
        return Optional.empty();
    }

    @Transactional
    public Optional<Appointment> confirmAppointmentChange(Long appointmentId) {
        if (appointmentId == null) {
            return Optional.empty();
        }
        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isPresent()) {
            Appointment appointment = optionalAppointment.get();
            if (appointment.isAwaitingPatientConfirmation()) {
                if (appointment.getPendingScheduledAt() != null) {
                    // Check slot availability before applying the reschedule
                    LocalDateTime newTime = appointment.getPendingScheduledAt().withSecond(0).withNano(0);
                    appointmentRepository.findActiveSlotForUpdate(appointment.getIdDoctor(), newTime)
                            .filter(existing -> !existing.getIdAp().equals(appointment.getIdAp()))
                            .ifPresent(existing -> {
                                throw new SlotAlreadyBookedException(
                                        "This time slot is no longer available. Another patient has already booked this slot. Please select a different time.");
                            });
                    appointment.setScheduledAt(newTime);
                    appointment.setPendingScheduledAt(null);
                }
                if (appointment.getPendingStatus() != null) {
                    appointment.setStatus(appointment.getPendingStatus());
                    appointment.setPendingStatus(null);
                }
                appointment.setAwaitingPatientConfirmation(false);
                appointment.setAwaitingDoctorConfirmation(false);
                notifyDoctor(appointment, "CHANGE_CONFIRMED_BY_PATIENT", "Patient confirmed your pending appointment change.", null);
                return Optional.of(appointmentRepository.save(appointment));
            }
        }
        return Optional.empty();
    }

    @Transactional
    public Optional<Appointment> rejectDoctorPostponeByPatient(Long appointmentId) {
        if (appointmentId == null) {
            return Optional.empty();
        }

        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isEmpty()) {
            return Optional.empty();
        }

        Appointment appointment = optionalAppointment.get();
        if (appointment.isAwaitingPatientConfirmation()
                && appointment.getPendingScheduledAt() != null
                && appointment.getPendingStatus() == null) {
            appointment.setPendingScheduledAt(null);
            appointment.setAwaitingPatientConfirmation(false);
            appointment.setAwaitingDoctorConfirmation(false);
            notifyDoctor(
                    appointment,
                    "PATIENT_REJECTED_POSTPONE",
                    "Patient rejected your postpone request.",
                    null
            );
            return Optional.of(appointmentRepository.save(appointment));
        }

        return Optional.empty();
    }

    @Transactional
    public Optional<Appointment> rejectDoctorCancellationByPatient(Long appointmentId) {
        if (appointmentId == null) {
            return Optional.empty();
        }

        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isEmpty()) {
            return Optional.empty();
        }

        Appointment appointment = optionalAppointment.get();
        if (appointment.isAwaitingPatientConfirmation()
                && "CANCELLED".equalsIgnoreCase(appointment.getPendingStatus())) {
            appointment.setPendingStatus(null);
            appointment.setPendingScheduledAt(null);
            appointment.setAwaitingPatientConfirmation(false);
            appointment.setAwaitingDoctorConfirmation(false);
            notifyDoctor(
                    appointment,
                    "PATIENT_REJECTED_CANCELLATION",
                    "Patient rejected your cancellation request.",
                    null
            );
            return Optional.of(appointmentRepository.save(appointment));
        }

        return Optional.empty();
    }

    @Transactional
    public Optional<Appointment> confirmAttendanceByDoctor(Long appointmentId, UUID doctorId) {
        if (appointmentId == null) {
            return Optional.empty();
        }

        Optional<Appointment> optionalAppointment = appointmentRepository.findById(appointmentId);
        if (optionalAppointment.isEmpty()) {
            return Optional.empty();
        }

        Appointment appointment = optionalAppointment.get();
        if (doctorId != null && appointment.getIdDoctor() != null && !doctorId.equals(appointment.getIdDoctor())) {
            throw new IllegalArgumentException("Only the assigned doctor can confirm attendance.");
        }

        if (!STATUS_SCHEDULED.equalsIgnoreCase(appointment.getStatus())) {
            throw new IllegalArgumentException("Only scheduled appointments can be marked as attended.");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime scheduledAt = appointment.getScheduledAt();
        
        if (scheduledAt == null) {
            throw new IllegalArgumentException("Appointment has no scheduled time.");
        }

        // Strict Date Check
        if (!now.toLocalDate().isEqual(scheduledAt.toLocalDate())) {
            throw new IllegalArgumentException("You can only confirm attendance on the scheduled day of the appointment (" + scheduledAt.toLocalDate() + ").");
        }

        LocalDateTime endAt = scheduledAt.plusMinutes(30); // Default duration

        if (now.isBefore(scheduledAt)) {
            throw new IllegalArgumentException("You cannot confirm attendance before the appointment starts (Scheduled for " + scheduledAt.toLocalTime() + ").");
        }
        if (now.isAfter(endAt)) {
            throw new IllegalArgumentException("You cannot confirm attendance after the appointment has ended (Session window closed at " + endAt.toLocalTime() + ").");
        }

        appointment.setStatus(STATUS_ATTENDED);
        appointment.setPendingStatus(null);
        appointment.setPendingScheduledAt(null);
        appointment.setAwaitingDoctorConfirmation(false);
        appointment.setAwaitingPatientConfirmation(false);
        Appointment saved = appointmentRepository.save(appointment);

        patientPenaltyService.recordAttendance(saved);
        notifyPatient(saved, "ATTENDANCE_CONFIRMED_BY_DOCTOR", "Doctor confirmed your attendance.", null);
        return Optional.of(saved);
    }

    private void notifyPatient(Appointment appointment, String eventType, String message, String reason) {
        appointmentNotificationService.sendNotification(
                appointment.getIdPatient(),
                "PATIENT",
                eventType,
                message,
                appointment,
                reason
        );
    }

    private void notifyDoctor(Appointment appointment, String eventType, String message, String reason) {
        appointmentNotificationService.sendNotification(
                appointment.getIdDoctor(),
                "DOCTOR",
                eventType,
                message,
                appointment,
                reason
        );
    }

    private String buildInitialAppointmentRequestMessage(Appointment appointment) {
        String appointmentType = appointment.getType() == null || appointment.getType().isBlank()
                ? "appointment"
                : appointment.getType().trim().replace('_', ' ').toLowerCase(Locale.ENGLISH);

        String scheduledAt = appointment.getScheduledAt() == null
                ? "an unspecified time"
                : appointment.getScheduledAt().format(APPOINTMENT_TIME_FORMATTER);

        return "Patient requested a " + appointmentType + " appointment for " + scheduledAt + ". Please accept or refuse.";
    }

    private String buildAppointmentConfirmationMessage(Appointment appointment) {
        String appointmentType = appointment.getType() == null || appointment.getType().isBlank()
                ? "appointment"
                : appointment.getType().trim().replace('_', ' ').toLowerCase(Locale.ENGLISH);

        String scheduledAt = appointment.getScheduledAt() == null
                ? "an unspecified time"
                : appointment.getScheduledAt().format(APPOINTMENT_TIME_FORMATTER);

        return "Doctor has created a " + appointmentType + " appointment for " + scheduledAt + ". Please confirm or decline.";
    }

    private String formatDateTime(LocalDateTime dateTime) {
        if (dateTime == null) {
            return "an unspecified time";
        }
        return dateTime.format(APPOINTMENT_TIME_FORMATTER);
    }
}