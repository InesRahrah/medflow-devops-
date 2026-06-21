package com.medflow.appointmentservice.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class DoctorPatientSummaryDTO {

    private UUID patientId;
    private String patientName;
    private LocalDateTime lastVisit;
    private long totalAppointments;

    public DoctorPatientSummaryDTO() {}

    public DoctorPatientSummaryDTO(UUID patientId, String patientName, LocalDateTime lastVisit, long totalAppointments) {
        this.patientId = patientId;
        this.patientName = patientName;
        this.lastVisit = lastVisit;
        this.totalAppointments = totalAppointments;
    }

    public UUID getPatientId() { return patientId; }
    public void setPatientId(UUID patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public LocalDateTime getLastVisit() { return lastVisit; }
    public void setLastVisit(LocalDateTime lastVisit) { this.lastVisit = lastVisit; }

    public long getTotalAppointments() { return totalAppointments; }
    public void setTotalAppointments(long totalAppointments) { this.totalAppointments = totalAppointments; }
}
