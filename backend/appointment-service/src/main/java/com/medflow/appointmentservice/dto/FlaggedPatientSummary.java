package com.medflow.appointmentservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FlaggedPatientSummary {
    private String patientId;
    private String patientName;
    private String tier;
    private double riskScore;
    private long offenseCountLast90Days;
    private long waivableCount;
    private boolean temporaryLocked;
}
