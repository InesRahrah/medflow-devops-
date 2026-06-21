package com.medflow.appointmentservice.service;

import com.medflow.appointmentservice.dto.AppointmentDashboardResponse;
import com.medflow.appointmentservice.entity.Appointment;
import com.medflow.appointmentservice.entity.Preconsultation;
import com.medflow.appointmentservice.entity.PreconsultationAnswer;
import com.medflow.appointmentservice.repository.AppointmentRepository;
import com.medflow.appointmentservice.repository.PreconsultationAnswerRepository;
import com.medflow.appointmentservice.repository.PreconsultationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentDashboardService {

    private static final String STATUS_SCHEDULED = "SCHEDULED";
    private static final String STATUS_ATTENDED = "ATTENDED";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final String STATUS_LATE_CANCEL = "LATE_CANCEL";
    private static final String STATUS_NO_SHOW = "NO_SHOW";
    private static final String STATUS_PENDING_DOCTOR_CONFIRMATION = "PENDING_DOCTOR_CONFIRMATION";
    private static final String STATUS_PENDING_PATIENT_CONFIRMATION = "PENDING_PATIENT_CONFIRMATION";

    private static final List<String> TRACKED_SYMPTOMS = List.of(
            "chest pain",
            "seizures",
            "fainting",
            "blood in stool",
            "blood in urine",
            "shortness of breath",
            "palpitations",
            "unstable blood pressure",
            "vision problems",
            "numbness",
            "loss of balance",
            "night sweats",
            "dizziness",
            "vertigo",
            "fever",
            "chills",
            "abdominal pain",
            "nausea",
            "vomiting",
            "painful urination",
            "pelvic pain",
            "ear pain",
            "eye pain",
            "frequent urination",
            "tingling",
            "headache",
            "back pain",
            "joint pain",
            "muscle pain",
            "joint swelling",
            "diarrhea",
            "constipation",
            "bloating",
            "cough",
            "wheezing",
            "sore throat",
            "nasal congestion",
            "fatigue",
            "hearing loss",
            "memory problems",
            "depression",
            "anxiety",
            "sleep problems",
            "skin rash",
            "itching",
            "skin lesions",
            "acne"
    );

    private static final Map<String, Pattern> SYMPTOM_PATTERNS = TRACKED_SYMPTOMS.stream()
            .collect(Collectors.toMap(
                    symptom -> symptom,
                    symptom -> Pattern.compile("(?i)(^|[^a-z])" + Pattern.quote(symptom) + "([^a-z]|$)")
            ));

    private final AppointmentRepository appointmentRepository;
    private final PreconsultationRepository preconsultationRepository;
    private final PreconsultationAnswerRepository preconsultationAnswerRepository;

    public AppointmentDashboardResponse getDashboard(LocalDate from, LocalDate to, int symptomLimit) {
        LocalDate effectiveTo = to != null ? to : LocalDate.now().plusDays(30);
        LocalDate effectiveFrom = from != null ? from : LocalDate.now().minusDays(29);

        LocalDateTime fromDateTime = effectiveFrom.atStartOfDay();
        LocalDateTime toDateTime = effectiveTo.atTime(LocalTime.MAX);

        List<Appointment> appointments = appointmentRepository.findByScheduledAtBetween(fromDateTime, toDateTime);
        Map<Long, String> appointmentText = buildAppointmentTextIndex(appointments);

        Set<UUID> assistedPatients = new HashSet<>();
        long scheduledAppointments = 0L;
        long attendedAppointments = 0L;
        long cancelledAppointments = 0L;
        long lateCancelledAppointments = 0L;
        long noShowAppointments = 0L;
        long pendingDoctorConfirmations = 0L;
        long pendingPatientConfirmations = 0L;

        Map<String, Long> symptomCounts = new HashMap<>();

        for (Appointment appointment : appointments) {
            String status = normalize(appointment.getStatus());
            if (STATUS_SCHEDULED.equals(status)) {
                scheduledAppointments++;
                if (appointment.getIdPatient() != null) {
                    assistedPatients.add(appointment.getIdPatient());
                }
            } else if (STATUS_ATTENDED.equals(status)) {
                attendedAppointments++;
                if (appointment.getIdPatient() != null) {
                    assistedPatients.add(appointment.getIdPatient());
                }
            } else if (STATUS_CANCELLED.equals(status)) {
                cancelledAppointments++;
            } else if (STATUS_LATE_CANCEL.equals(status)) {
                lateCancelledAppointments++;
                cancelledAppointments++;
            } else if (STATUS_NO_SHOW.equals(status)) {
                noShowAppointments++;
            } else if (STATUS_PENDING_DOCTOR_CONFIRMATION.equals(status)) {
                pendingDoctorConfirmations++;
            } else if (STATUS_PENDING_PATIENT_CONFIRMATION.equals(status)) {
                pendingPatientConfirmations++;
            }

            String text = appointmentText.get(appointment.getIdAp());
            if (text == null || text.isBlank()) {
                continue;
            }

            Set<String> matchedSymptoms = extractSymptoms(text);
            for (String symptom : matchedSymptoms) {
                symptomCounts.merge(symptom, 1L, Long::sum);
            }
        }

        long totalAppointments = appointments.size();
        long successfulAppointments = scheduledAppointments + attendedAppointments;
        double bookingSuccessRate = totalAppointments == 0
                ? 0.0
            : roundPercentage((successfulAppointments * 100.0) / totalAppointments);
        double cancellationRate = totalAppointments == 0
                ? 0.0
                : roundPercentage((cancelledAppointments * 100.0) / totalAppointments);
        double lateCancellationRate = totalAppointments == 0
            ? 0.0
            : roundPercentage((lateCancelledAppointments * 100.0) / totalAppointments);
        double noShowRate = totalAppointments == 0
            ? 0.0
            : roundPercentage((noShowAppointments * 100.0) / totalAppointments);

        List<AppointmentDashboardResponse.SymptomMetric> topSymptoms = symptomCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder())
                        .thenComparing(Map.Entry.comparingByKey()))
                .limit(Math.max(symptomLimit, 1))
                .map(entry -> AppointmentDashboardResponse.SymptomMetric.builder()
                        .symptom(entry.getKey())
                        .count(entry.getValue())
                        .build())
                .toList();

        return AppointmentDashboardResponse.builder()
                .from(effectiveFrom)
                .to(effectiveTo)
                .summary(AppointmentDashboardResponse.Summary.builder()
                        .totalAppointments(totalAppointments)
                        .patientsAssisted(assistedPatients.size())
                        .scheduledAppointments(scheduledAppointments)
                        .cancelledAppointments(cancelledAppointments)
                        .lateCancelledAppointments(lateCancelledAppointments)
                        .noShowAppointments(noShowAppointments)
                        .pendingDoctorConfirmations(pendingDoctorConfirmations)
                        .pendingPatientConfirmations(pendingPatientConfirmations)
                        .bookingSuccessRate(bookingSuccessRate)
                        .cancellationRate(cancellationRate)
                        .lateCancellationRate(lateCancellationRate)
                        .noShowRate(noShowRate)
                        .build())
                .topSymptoms(topSymptoms)
                .build();
    }

    private Map<Long, String> buildAppointmentTextIndex(List<Appointment> appointments) {
        if (appointments.isEmpty()) {
            return Map.of();
        }

        List<Long> appointmentIds = appointments.stream()
                .map(Appointment::getIdAp)
                .toList();

        Map<Long, StringBuilder> textByAppointmentId = new LinkedHashMap<>();
        for (Appointment appointment : appointments) {
            StringBuilder builder = new StringBuilder();
            if (appointment.getAiSummary() != null && !appointment.getAiSummary().isBlank()) {
                builder.append(appointment.getAiSummary()).append(' ');
            }
            textByAppointmentId.put(appointment.getIdAp(), builder);
        }

        List<Preconsultation> preconsultations = preconsultationRepository.findByAppointmentIdApIn(appointmentIds);
        if (preconsultations.isEmpty()) {
            return textByAppointmentId.entrySet().stream()
                    .collect(Collectors.toMap(Map.Entry::getKey, entry -> entry.getValue().toString()));
        }

        Map<Long, Long> responseToAppointmentId = new HashMap<>();
        List<Long> responseIds = new ArrayList<>();
        for (Preconsultation preconsultation : preconsultations) {
            if (preconsultation.getAppointment() != null && preconsultation.getAppointment().getIdAp() != null) {
                responseToAppointmentId.put(preconsultation.getId(), preconsultation.getAppointment().getIdAp());
                responseIds.add(preconsultation.getId());
            }
        }

        if (!responseIds.isEmpty()) {
            List<PreconsultationAnswer> answers = preconsultationAnswerRepository.findByResponseIdIn(responseIds);
            for (PreconsultationAnswer answer : answers) {
                if (answer.getResponse() == null) {
                    continue;
                }
                Long appointmentId = responseToAppointmentId.get(answer.getResponse().getId());
                if (appointmentId == null) {
                    continue;
                }
                StringBuilder builder = textByAppointmentId.computeIfAbsent(appointmentId, ignored -> new StringBuilder());
                if (answer.getQuestion() != null && answer.getQuestion().getText() != null) {
                    builder.append(answer.getQuestion().getText()).append(' ');
                }
                if (answer.getValue() != null) {
                    builder.append(answer.getValue()).append(' ');
                }
            }
        }

        return textByAppointmentId.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, entry -> entry.getValue().toString()));
    }

    private Set<String> extractSymptoms(String text) {
        String normalizedText = normalize(text);
        Set<String> matches = new HashSet<>();
        for (Map.Entry<String, Pattern> entry : SYMPTOM_PATTERNS.entrySet()) {
            if (entry.getValue().matcher(normalizedText).find()) {
                matches.add(entry.getKey());
            }
        }
        return matches;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private double roundPercentage(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}