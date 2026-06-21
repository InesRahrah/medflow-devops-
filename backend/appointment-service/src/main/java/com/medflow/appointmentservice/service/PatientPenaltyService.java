package com.medflow.appointmentservice.service;

import com.medflow.appointmentservice.dto.AppealResponse;
import com.medflow.appointmentservice.dto.FlaggedPatientSummary;
import com.medflow.appointmentservice.dto.NotificationRequest;
import com.medflow.appointmentservice.dto.PatientPenaltyProfileResponse;
import com.medflow.appointmentservice.entity.AppealStatus;
import com.medflow.appointmentservice.entity.Appointment;
import com.medflow.appointmentservice.entity.PenaltyAppeal;
import com.medflow.appointmentservice.entity.PenaltyEvent;
import com.medflow.appointmentservice.entity.PenaltyEventType;
import com.medflow.appointmentservice.repository.AppointmentRepository;
import com.medflow.appointmentservice.repository.PenaltyAppealRepository;
import com.medflow.appointmentservice.repository.PenaltyEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PatientPenaltyService {

    private static final String TIER_GREEN = "GREEN";
    private static final String TIER_AMBER = "AMBER";
    private static final String TIER_RED = "RED";
    private static final String TIER_BLACK = "BLACK";

    private final PenaltyEventRepository penaltyEventRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserProfileLookupService userProfileLookupService;
    private final NotificationService notificationService;
    private final PenaltyAppealRepository penaltyAppealRepository;

    @Value("${penalty.policy.free-cancel-hours:24}")
    private long freeCancelHours;

    @Value("${penalty.policy.risk-window-days:90}")
    private long riskWindowDays;

    @Value("${penalty.policy.black-lock-days:14}")
    private long blackLockDays;

    @Value("${penalty.policy.amber-threshold:2}")
    private double amberThreshold;

    @Value("${penalty.policy.red-threshold:4}")
    private double redThreshold;

    @Value("${penalty.policy.black-threshold:6}")
    private double blackThreshold;

    @Value("${penalty.policy.first-offense-warning:true}")
    private boolean firstOffenseWarning;

    public void enforceBookingPolicyForPatient(UUID patientId, LocalDateTime scheduledAt) {
        if (patientId == null || scheduledAt == null) {
            return;
        }

        PatientPenaltyProfileResponse profile = getPatientPenaltyProfile(patientId);

        if (profile.isTemporaryLocked()) {
            throw new IllegalArgumentException("Booking is temporarily locked due to repeated no-shows/late cancellations.");
        }

        if (profile.isSameDayBookingBlocked() && scheduledAt.toLocalDate().isEqual(LocalDate.now())) {
            throw new IllegalArgumentException("Same-day booking is currently blocked due to recent reliability issues.");
        }

        if (TIER_RED.equals(profile.getTier())) {
            long activeFutureAppointments = appointmentRepository.countActiveFutureAppointments(patientId, LocalDateTime.now());
            if (activeFutureAppointments >= 1) {
                throw new IllegalArgumentException("You can only keep one active future appointment at a time due to recent no-shows/late cancellations.");
            }
        }
    }

    @Transactional
    public void recordLateCancellation(Appointment appointment) {
        registerOffense(appointment, PenaltyEventType.LATE_CANCEL, 1, "Late cancellation inside free cancellation window.");
    }

    @Transactional
    public void recordNoShow(Appointment appointment) {
        registerOffense(appointment, PenaltyEventType.NO_SHOW, 2, "Patient did not attend within grace period.");
    }

    @Transactional
    public void recordAttendance(Appointment appointment) {
        if (appointment == null || appointment.getIdPatient() == null) {
            return;
        }

        PenaltyEvent event = new PenaltyEvent();
        event.setAppointmentId(appointment.getIdAp());
        event.setPatientId(appointment.getIdPatient());
        event.setDoctorId(appointment.getIdDoctor());
        event.setOccurredAt(LocalDateTime.now());
        event.setEventType(PenaltyEventType.ATTENDED);
        event.setScoreDelta(-1);
        event.setNotes("Doctor confirmed attendance.");
        penaltyEventRepository.save(event);
    }

    // -------------------------------------------------------------------------
    // Appeal flow
    // -------------------------------------------------------------------------

    @Transactional
    public AppealResponse submitAppeal(UUID patientId, Long eventId, String explanation) {
        PenaltyEvent event = penaltyEventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Penalty event not found."));

        if (!event.getPatientId().equals(patientId)) {
            throw new IllegalArgumentException("Penalty event does not belong to this patient.");
        }

        if (event.isWaived()) {
            throw new IllegalArgumentException("This penalty has already been waived.");
        }

        if (event.getEventType() != PenaltyEventType.LATE_CANCEL
                && event.getEventType() != PenaltyEventType.NO_SHOW
                && event.getEventType() != PenaltyEventType.WARNING_NO_PENALTY) {
            throw new IllegalArgumentException("Only offense events can be appealed.");
        }

        boolean alreadyOpen = penaltyAppealRepository.existsByPenaltyEventIdAndPatientIdAndStatusIn(
                eventId, patientId, List.of(AppealStatus.PENDING));
        if (alreadyOpen) {
            throw new IllegalArgumentException("An appeal for this event is already pending review.");
        }

        PenaltyAppeal appeal = new PenaltyAppeal();
        appeal.setPenaltyEventId(eventId);
        appeal.setPatientId(patientId);
        appeal.setExplanation(StringUtils.hasText(explanation) ? explanation.trim() : null);
        appeal.setStatus(AppealStatus.PENDING);
        penaltyAppealRepository.save(appeal);

        // Notify patient that their appeal was received
        try {
            NotificationRequest req = new NotificationRequest();
            req.setRecipientId(patientId);
            req.setRecipientRole("PATIENT");
            req.setEventType("APPEAL_SUBMITTED");
            req.setMessage("Your appeal for the " + event.getEventType().name().replace("_", " ")
                    + " offense has been submitted and is pending admin review. "
                    + "You will be notified once a decision is made.");
            req.setPatientId(patientId);
            notificationService.create(req);
        } catch (Exception ignored) { }

        return toAppealResponse(appeal, event);
    }

    public List<AppealResponse> getMyAppeals(UUID patientId) {
        return penaltyAppealRepository.findByPatientIdOrderBySubmittedAtDesc(patientId)
                .stream()
                .map(appeal -> {
                    PenaltyEvent event = penaltyEventRepository.findById(appeal.getPenaltyEventId()).orElse(null);
                    return toAppealResponse(appeal, event);
                })
                .toList();
    }

    public List<AppealResponse> getPendingAppeals() {
        return penaltyAppealRepository.findByStatusOrderBySubmittedAtAsc(AppealStatus.PENDING)
                .stream()
                .map(appeal -> {
                    PenaltyEvent event = penaltyEventRepository.findById(appeal.getPenaltyEventId()).orElse(null);
                    return toAppealResponse(appeal, event);
                })
                .toList();
    }

    @Transactional
    public AppealResponse decideAppeal(Long appealId, boolean approved, String adminNote) {
        PenaltyAppeal appeal = penaltyAppealRepository.findById(appealId)
                .orElseThrow(() -> new IllegalArgumentException("Appeal not found."));

        if (appeal.getStatus() != AppealStatus.PENDING) {
            throw new IllegalArgumentException("This appeal has already been reviewed.");
        }

        appeal.setStatus(approved ? AppealStatus.APPROVED : AppealStatus.REJECTED);
        appeal.setAdminNote(StringUtils.hasText(adminNote) ? adminNote.trim() : null);
        appeal.setReviewedAt(java.time.LocalDateTime.now());
        penaltyAppealRepository.save(appeal);

        if (approved) {
            penaltyEventRepository.findById(appeal.getPenaltyEventId()).ifPresent(event -> {
                String note = "[APPEAL APPROVED] " + (StringUtils.hasText(adminNote) ? adminNote.trim() : "Approved by admin");
                event.setNotes((event.getNotes() == null ? "" : event.getNotes() + " ") + note);
                penaltyEventRepository.save(event);
            });

            // Notify patient: approved
            try {
                NotificationRequest req = new NotificationRequest();
                req.setRecipientId(appeal.getPatientId());
                req.setRecipientRole("PATIENT");
                req.setEventType("APPEAL_APPROVED");
                req.setMessage("Your penalty appeal has been approved. The offense has been removed from your record "
                        + "and your risk score has been adjusted accordingly."
                        + (StringUtils.hasText(adminNote) ? " Admin note: " + adminNote.trim() : ""));
                req.setPatientId(appeal.getPatientId());
                notificationService.create(req);
            } catch (Exception ignored) { }
        } else {
            // Notify patient: rejected
            try {
                NotificationRequest req = new NotificationRequest();
                req.setRecipientId(appeal.getPatientId());
                req.setRecipientRole("PATIENT");
                req.setEventType("APPEAL_REJECTED");
                req.setMessage("Your penalty appeal has been reviewed and was not approved. "
                        + "The penalty remains on your record."
                        + (StringUtils.hasText(adminNote) ? " Admin note: " + adminNote.trim() : ""));
                req.setPatientId(appeal.getPatientId());
                notificationService.create(req);
            } catch (Exception ignored) { }
        }

        PenaltyEvent event = penaltyEventRepository.findById(appeal.getPenaltyEventId()).orElse(null);
        return toAppealResponse(appeal, event);
    }

    private AppealResponse toAppealResponse(PenaltyAppeal appeal, PenaltyEvent event) {
        return AppealResponse.builder()
                .appealId(appeal.getId())
                .penaltyEventId(appeal.getPenaltyEventId())
                .eventType(event != null ? event.getEventType() : null)
                .eventOccurredAt(event != null ? event.getOccurredAt() : null)
                .explanation(appeal.getExplanation())
                .status(appeal.getStatus())
                .adminNote(appeal.getAdminNote())
                .submittedAt(appeal.getSubmittedAt())
                .reviewedAt(appeal.getReviewedAt())
                .build();
    }

    public boolean isLateCancellation(Appointment appointment) {
        if (appointment == null || appointment.getScheduledAt() == null) {
            return false;
        }
        LocalDateTime cutoff = appointment.getScheduledAt().minusHours(freeCancelHours);
        return LocalDateTime.now().isAfter(cutoff);
    }

    public PatientPenaltyProfileResponse getPatientPenaltyProfile(UUID patientId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime windowStart = now.minusDays(riskWindowDays);

        List<PenaltyEvent> recentWindowEvents = penaltyEventRepository
                .findByPatientIdAndOccurredAtAfterOrderByOccurredAtDesc(patientId, windowStart);

        double score = recentWindowEvents.stream()
                .filter(event -> !event.isWaived())
                .mapToInt(PenaltyEvent::getScoreDelta)
                .sum();
        
        // Automatic reduction: if attended appointments > missed/late-cancelled appointments, reduce score by 50%
        long attendedCount = recentWindowEvents.stream()
                .filter(e -> e.getEventType() == PenaltyEventType.ATTENDED)
                .count();
        long missedCount = recentWindowEvents.stream()
                .filter(e -> e.getEventType() == PenaltyEventType.NO_SHOW || e.getEventType() == PenaltyEventType.LATE_CANCEL)
                .count();
        
        if (attendedCount > missedCount && score > 0) {
            score = score / 2.0;
        }

        score = Math.max(0, score);

        String tier = classifyTier(score);

        long offenseCount = recentWindowEvents.stream()
                .filter(event -> !event.isWaived())
                .filter(event -> event.getEventType() == PenaltyEventType.LATE_CANCEL || event.getEventType() == PenaltyEventType.NO_SHOW)
                .count();

        boolean sameDayBlocked = TIER_AMBER.equals(tier) || TIER_RED.equals(tier) || TIER_BLACK.equals(tier);
        boolean adminApprovalRequired = TIER_RED.equals(tier) || TIER_BLACK.equals(tier);

        LocalDateTime lockUntil = null;
        if (TIER_BLACK.equals(tier)) {
            lockUntil = penaltyEventRepository
                    .findFirstByPatientIdAndEventTypeInAndWaivedFalseOrderByOccurredAtDesc(
                            patientId,
                            List.of(PenaltyEventType.LATE_CANCEL, PenaltyEventType.NO_SHOW)
                    )
                    .map(event -> event.getOccurredAt().plusDays(blackLockDays))
                    .orElse(now.plusDays(blackLockDays));
        }
        boolean temporaryLocked = lockUntil != null && lockUntil.isAfter(now);

        List<String> restrictions = new ArrayList<>();
        if (sameDayBlocked) {
            restrictions.add("No same-day booking");
        }
        if (TIER_RED.equals(tier)) {
            restrictions.add("Maximum one active future appointment");
            restrictions.add("Admin review may be required for overrides");
        }
        if (temporaryLocked) {
            restrictions.add("Temporary booking lock");
        }

        List<PatientPenaltyProfileResponse.PenaltyEventView> events = penaltyEventRepository.findTop20ByPatientIdOrderByOccurredAtDesc(patientId)
                .stream()
                .map(event -> {
                    PenaltyAppeal appeal = penaltyAppealRepository
                            .findByPenaltyEventIdAndPatientId(event.getId(), patientId)
                            .orElse(null);
                    return PatientPenaltyProfileResponse.PenaltyEventView.builder()
                            .id(event.getId())
                            .appointmentId(event.getAppointmentId())
                            .eventType(event.getEventType())
                            .scoreDelta(event.getScoreDelta())
                            .occurredAt(event.getOccurredAt())
                            .waived(event.isWaived())
                            .notes(event.getNotes())
                            .appealStatus(appeal != null ? appeal.getStatus() : null)
                            .patientExplanation(appeal != null ? appeal.getExplanation() : null)
                            .build();
                })
                .toList();

        return PatientPenaltyProfileResponse.builder()
                .patientId(patientId.toString())
                .riskScore(score)
                .tier(tier)
                .offenseCountLast90Days(offenseCount)
                .sameDayBookingBlocked(sameDayBlocked)
                .adminApprovalRequired(adminApprovalRequired)
                .temporaryLocked(temporaryLocked)
                .lockUntil(lockUntil)
                .activeRestrictions(restrictions)
                .recentEvents(events)
                .build();
    }

    public List<FlaggedPatientSummary> getFlaggedPatients() {
        List<UUID> patientIds = penaltyEventRepository.findDistinctPatientIdsWithPenalties();
        return patientIds.stream()
                .map(patientId -> {
                    PatientPenaltyProfileResponse profile = getPatientPenaltyProfile(patientId);
                    long waivableCount = penaltyEventRepository
                            .findByPatientIdAndEventTypeInAndWaivedFalseOrderByOccurredAtDesc(
                                    patientId,
                                    List.of(PenaltyEventType.LATE_CANCEL, PenaltyEventType.NO_SHOW, PenaltyEventType.WARNING_NO_PENALTY)
                            ).size();
                    String displayName;
                    try {
                        displayName = userProfileLookupService.getDisplayName(patientId);
                    } catch (Exception e) {
                        displayName = patientId.toString();
                    }
                    return FlaggedPatientSummary.builder()
                            .patientId(patientId.toString())
                            .patientName(displayName)
                            .tier(profile.getTier())
                            .riskScore(profile.getRiskScore())
                            .offenseCountLast90Days(profile.getOffenseCountLast90Days())
                            .waivableCount(waivableCount)
                            .temporaryLocked(profile.isTemporaryLocked())
                            .build();
                })
                .toList();
    }


    private void registerOffense(Appointment appointment, PenaltyEventType type, int scoreDelta, String notes) {
        if (appointment == null || appointment.getIdPatient() == null) {
            return;
        }

        LocalDateTime windowStart = LocalDateTime.now().minusDays(riskWindowDays);
        long previousOffenses = penaltyEventRepository.countByPatientIdAndEventTypeInAndOccurredAtAfterAndWaivedFalse(
                appointment.getIdPatient(),
                List.of(PenaltyEventType.LATE_CANCEL, PenaltyEventType.NO_SHOW, PenaltyEventType.WARNING_NO_PENALTY),
                windowStart
        );

        PenaltyEvent event = new PenaltyEvent();
        event.setAppointmentId(appointment.getIdAp());
        event.setPatientId(appointment.getIdPatient());
        event.setDoctorId(appointment.getIdDoctor());
        event.setOccurredAt(LocalDateTime.now());

        if (firstOffenseWarning && previousOffenses == 0) {
            event.setEventType(PenaltyEventType.WARNING_NO_PENALTY);
            event.setScoreDelta(0);
            event.setNotes("First offense warning only. " + notes);
            penaltyEventRepository.save(event);
            try {
                String doctorName = "your doctor";
                try {
                    String resolved = userProfileLookupService.getDisplayName(appointment.getIdDoctor());
                    if (resolved != null && !resolved.isBlank()) {
                        doctorName = "Dr. " + resolved;
                    }
                } catch (Exception ignored) { }

                String action = type == PenaltyEventType.NO_SHOW
                        ? "did not attend your appointment with " + doctorName
                        : "canceled your appointment with " + doctorName + " less than 24 hours before the scheduled time";

                NotificationRequest req = new NotificationRequest();
                req.setRecipientId(appointment.getIdPatient());
                req.setRecipientRole("PATIENT");
                req.setEventType("PENALTY_WARNING");
                req.setMessage("Because you " + action + ", this is considered a first offense. "
                        + "No penalty has been applied this time, but future violations will affect your booking privileges.");
                req.setAppointmentId(appointment.getIdAp());
                req.setPatientId(appointment.getIdPatient());
                req.setDoctorId(appointment.getIdDoctor());
                req.setScheduledAt(appointment.getScheduledAt());
                notificationService.create(req);
            } catch (Exception ex) {
                // log but do not fail the penalty recording
            }
            return;
        } else {
            event.setEventType(type);
            event.setScoreDelta(scoreDelta);
            event.setNotes(notes);
        }

        // Capture tier BEFORE saving so we can detect a zone entry after
        double scoreBefore = penaltyEventRepository
                .findByPatientIdAndOccurredAtAfterOrderByOccurredAtDesc(
                        appointment.getIdPatient(),
                        LocalDateTime.now().minusDays(riskWindowDays))
                .stream()
                .filter(e -> !e.isWaived())
                .mapToInt(PenaltyEvent::getScoreDelta)
                .sum();
        String tierBefore = classifyTier(Math.max(0, scoreBefore));

        penaltyEventRepository.save(event);

        double scoreAfter = Math.max(0, scoreBefore + event.getScoreDelta());
        String tierAfter = classifyTier(scoreAfter);

        if (!tierAfter.equals(tierBefore) && !TIER_GREEN.equals(tierAfter)) {
            sendTierChangeNotification(appointment, type, tierAfter, (int) Math.round(scoreAfter));
        }
    }

    private void sendTierChangeNotification(Appointment appointment, PenaltyEventType offenseType,
                                            String newTier, int newScore) {
        try {
            String doctorName = "your doctor";
            try {
                String resolved = userProfileLookupService.getDisplayName(appointment.getIdDoctor());
                if (resolved != null && !resolved.isBlank()) {
                    doctorName = "Dr. " + resolved;
                }
            } catch (Exception ignored) { }

            String offenseDesc = offenseType == PenaltyEventType.NO_SHOW
                    ? "not attending your appointment with " + doctorName
                    : "canceling your appointment with " + doctorName + " less than 24 hours before the scheduled time";

            String restrictionDesc;
            switch (newTier) {
                case TIER_AMBER -> restrictionDesc = "You can no longer book same-day appointments.";
                case TIER_RED   -> restrictionDesc = "You can no longer book same-day appointments, and you may only keep one active future appointment at a time.";
                case TIER_BLACK -> restrictionDesc = "Your account has been temporarily locked from booking for " + blackLockDays + " days. "
                            + "No same-day booking and only one active future appointment will apply after the lock is lifted.";
                default         -> restrictionDesc = "Booking restrictions are now in effect.";
            }

            String message = "Due to " + offenseDesc + ", booking restrictions have been applied to your account. "
                    + restrictionDesc
                    + " You can contact support or your care team to request a review.";

            NotificationRequest req = new NotificationRequest();
            req.setRecipientId(appointment.getIdPatient());
            req.setRecipientRole("PATIENT");
            req.setEventType("PENALTY_TIER_CHANGE");
            req.setMessage(message);
            req.setAppointmentId(appointment.getIdAp());
            req.setPatientId(appointment.getIdPatient());
            req.setDoctorId(appointment.getIdDoctor());
            req.setScheduledAt(appointment.getScheduledAt());
            notificationService.create(req);
        } catch (Exception ex) {
            // do not fail the penalty recording if notification dispatch fails
        }
    }

    private String classifyTier(double score) {
        if (score >= blackThreshold) {
            return TIER_BLACK;
        }
        if (score >= redThreshold) {
            return TIER_RED;
        }
        if (score >= amberThreshold) {
            return TIER_AMBER;
        }
        return TIER_GREEN;
    }
}
