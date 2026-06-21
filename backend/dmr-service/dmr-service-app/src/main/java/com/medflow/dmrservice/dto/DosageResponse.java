package com.medflow.dmrservice.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class DosageResponse {
    UUID id;
    UUID prescriptionId;
    UUID medicineId;
    String quantity;
    String doseNotes;
    LocalDateTime time;
    boolean taken;
}
