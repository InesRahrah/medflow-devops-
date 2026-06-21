package com.medflow.appointmentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentDashboardResponse {

    private LocalDate from;
    private LocalDate to;
    private Summary summary;
    private List<SymptomMetric> topSymptoms;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private long totalAppointments;
        private long patientsAssisted;
        private long scheduledAppointments;
        private long cancelledAppointments;
        private long lateCancelledAppointments;
        private long noShowAppointments;
        private long pendingDoctorConfirmations;
        private long pendingPatientConfirmations;
        private double bookingSuccessRate;
        private double cancellationRate;
        private double lateCancellationRate;
        private double noShowRate;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SymptomMetric {
        private String symptom;
        private long count;
    }
}