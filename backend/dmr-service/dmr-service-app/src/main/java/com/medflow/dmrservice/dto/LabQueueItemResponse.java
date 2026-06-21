package com.medflow.dmrservice.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class LabQueueItemResponse {
    UUID requestId;
    UUID medicalCaseId;
    UUID patientId;
    String patientName;
    UUID requestedByDoctorId;
    String requestedByName;
    UUID laboId;
    String laboName;
    String testType;
    String notes;
    String status;
    LocalDateTime requestedAt;
}
