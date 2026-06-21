package com.medflow.appointmentservice.dto;

import com.medflow.appointmentservice.entity.AppealStatus;
import com.medflow.appointmentservice.entity.PenaltyEventType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class AppealResponse {

    private Long appealId;
    private Long penaltyEventId;
    private PenaltyEventType eventType;
    private LocalDateTime eventOccurredAt;
    private String explanation;
    private AppealStatus status;
    private String adminNote;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
}
