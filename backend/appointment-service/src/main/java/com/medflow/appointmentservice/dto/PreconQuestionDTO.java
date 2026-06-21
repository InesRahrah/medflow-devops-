package com.medflow.appointmentservice.dto;

import lombok.Data;

import java.util.List;

@Data
public class PreconQuestionDTO {
    private Long id;
    private Integer orderIndex;
    private String text;
    private String type;
    private Boolean required;
    private List<String> options;
}