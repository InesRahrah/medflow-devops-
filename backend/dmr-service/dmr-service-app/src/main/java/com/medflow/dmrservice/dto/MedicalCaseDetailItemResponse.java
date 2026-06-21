package com.medflow.dmrservice.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class MedicalCaseDetailItemResponse {
    UUID id;
    UUID doctorId;
    UUID laboId;
    UUID labRequestId;
    String type;
    String status;
    String name;
    String involvedPersonnel;
    String additionalInfo;
    String fileUrl;
    LocalDateTime date;
}
