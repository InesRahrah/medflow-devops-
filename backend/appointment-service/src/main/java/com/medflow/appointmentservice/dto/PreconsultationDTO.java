package com.medflow.appointmentservice.dto;

import lombok.Data;

import java.util.List;

@Data
public class PreconsultationDTO {
    private Long idP;
    private String notes;
    private List<PreconQuestionDTO> questions;
}