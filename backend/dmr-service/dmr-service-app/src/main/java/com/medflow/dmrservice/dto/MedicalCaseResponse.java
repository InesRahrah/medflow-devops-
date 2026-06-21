package com.medflow.dmrservice.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Value
@Builder
public class MedicalCaseResponse {
    UUID id;
    UUID patientId;
    UUID doctorId;
    String name;
    LocalDate startDate;
    LocalDate endDate;
    LocalDateTime createdAt;
    Set<UUID> members;
}
