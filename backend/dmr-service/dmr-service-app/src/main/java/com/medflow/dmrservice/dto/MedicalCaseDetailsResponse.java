package com.medflow.dmrservice.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.UUID;

@Value
@Builder
public class MedicalCaseDetailsResponse {
    UUID medicalCaseId;
    String caseName;
    List<MedicalCaseDetailItemResponse> details;
}
