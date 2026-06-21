package com.medflow.appointmentservice.dto;

import com.medflow.appointmentservice.entity.AppealStatus;
import com.medflow.appointmentservice.entity.PenaltyEventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientPenaltyProfileResponse {

    private String patientId;
    private double riskScore;
    private String tier;
    private long offenseCountLast90Days;
    private boolean sameDayBookingBlocked;
    private boolean adminApprovalRequired;
    private boolean temporaryLocked;
    private LocalDateTime lockUntil;
    private List<String> activeRestrictions;
    private List<PenaltyEventView> recentEvents;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PenaltyEventView {
        private Long id;
        private Long appointmentId;
        private PenaltyEventType eventType;
        private int scoreDelta;
        private LocalDateTime occurredAt;
        private boolean waived;
        private String notes;
        private AppealStatus appealStatus;
        private String patientExplanation;
    }
}
