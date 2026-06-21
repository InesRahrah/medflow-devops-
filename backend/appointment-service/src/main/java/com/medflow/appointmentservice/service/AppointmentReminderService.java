package com.medflow.appointmentservice.service;

import com.medflow.appointmentservice.entity.Appointment;
import com.medflow.appointmentservice.entity.Notification;
import com.medflow.appointmentservice.repository.AppointmentRepository;
import com.medflow.appointmentservice.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class AppointmentReminderService {

    private static final Logger log = LoggerFactory.getLogger(AppointmentReminderService.class);
    private static final String REMINDER_EVENT_TYPE = "PATIENT_APPOINTMENT_REMINDER_24H";
    private static final Set<String> REMINDABLE_STATUSES = Set.of(
            "SCHEDULED",
            "PENDING_DOCTOR_CONFIRMATION",
            "PENDING_PATIENT_CONFIRMATION"
    );
    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("EEEE, MMM d 'at' h:mm a", Locale.ENGLISH);

    private final AppointmentRepository appointmentRepository;
    private final NotificationRepository notificationRepository;
    private final UserProfileLookupService userProfileLookupService;
    private final JavaMailSender mailSender;

    @Value("${appointment.reminder.enabled:true}")
    private boolean reminderEnabled;

    @Value("${appointment.reminder.lead-hours:24}")
    private long leadHours;

    @Value("${appointment.reminder.window-minutes:15}")
    private long windowMinutes;

    @Value("${spring.mail.username:no-reply@medflow.local}")
    private String fromEmail;

    public AppointmentReminderService(AppointmentRepository appointmentRepository,
                                      NotificationRepository notificationRepository,
                                      UserProfileLookupService userProfileLookupService,
                                      JavaMailSender mailSender) {
        this.appointmentRepository = appointmentRepository;
        this.notificationRepository = notificationRepository;
        this.userProfileLookupService = userProfileLookupService;
        this.mailSender = mailSender;
    }

    @Scheduled(cron = "${appointment.reminder.cron:0 */15 * * * *}")
    public void send24HourReminders() {
        if (!reminderEnabled) {
            return;
        }

        LocalDateTime windowStart = LocalDateTime.now().plusHours(leadHours);
        LocalDateTime windowEnd = windowStart.plusMinutes(windowMinutes);

        List<Appointment> appointments = appointmentRepository.findByScheduledAtBetween(windowStart, windowEnd);

        for (Appointment appointment : appointments) {
            if (appointment == null || appointment.getIdAp() == null || appointment.getIdPatient() == null) {
                continue;
            }
            if (appointment.getStatus() == null || !REMINDABLE_STATUSES.contains(appointment.getStatus())) {
                continue;
            }

            UUID patientId = appointment.getIdPatient();
            boolean alreadySent = notificationRepository
                    .existsByAppointmentIdAndEventTypeAndRecipientId(appointment.getIdAp(), REMINDER_EVENT_TYPE, patientId);
            if (alreadySent) {
                continue;
            }

            UserProfileLookupService.UserProfile patientProfile = userProfileLookupService.getProfile(patientId);
            String patientEmail = patientProfile == null ? null : patientProfile.getEmail();
            if (patientEmail == null || patientEmail.isBlank()) {
                log.warn("Skipping reminder for appointment {}: patient {} has no email", appointment.getIdAp(), patientId);
                continue;
            }

            try {
                sendEmail(patientEmail, buildEmailSubject(), buildEmailBody(appointment, patientProfile));
                saveReminderLog(appointment);
                log.info("24h reminder sent for appointment {} to {}", appointment.getIdAp(), patientEmail);
            } catch (Exception ex) {
                log.warn("Failed sending 24h reminder for appointment {}: {}", appointment.getIdAp(), ex.getMessage());
            }
        }
    }

    private void sendEmail(String to, String subject, String body) {
        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setFrom(fromEmail);
        mail.setTo(to);
        mail.setSubject(subject);
        mail.setText(body);
        mailSender.send(mail);
    }

    private void saveReminderLog(Appointment appointment) {
        Notification notification = new Notification();
        notification.setRecipientId(appointment.getIdPatient());
        notification.setRecipientRole("PATIENT");
        notification.setEventType(REMINDER_EVENT_TYPE);
        notification.setMessage("24-hour appointment reminder email sent");
        notification.setAppointmentId(appointment.getIdAp());
        notification.setPatientId(appointment.getIdPatient());
        notification.setDoctorId(appointment.getIdDoctor());
        notification.setScheduledAt(appointment.getScheduledAt());
        notification.setStatus(appointment.getStatus());
        notificationRepository.save(notification);
    }

    private String buildEmailSubject() {
        return "Reminder: your MedFlow appointment is in 24 hours";
    }

    private String buildEmailBody(Appointment appointment, UserProfileLookupService.UserProfile patientProfile) {
        String patientName = (patientProfile != null && patientProfile.getDisplayName() != null)
                ? patientProfile.getDisplayName()
                : "Patient";

        String scheduleText = appointment.getScheduledAt() == null
                ? "tomorrow"
                : appointment.getScheduledAt().format(DATE_TIME_FORMATTER);

        return "Hello " + patientName + ",\n\n"
                + "This is a reminder that you have an appointment scheduled for " + scheduleText + ".\n"
                + "Please make sure to arrive on time.\n\n"
                + "Regards,\n"
                + "MedFlow Team";
    }
}
