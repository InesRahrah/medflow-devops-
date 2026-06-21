package com.medflow.blogservice.dto;

import lombok.Data;
import java.util.List;

@Data
public class AiRecommendationRequest {
    private String patientId;
    private List<String> chronicDiseases;
    private List<String> allergies;
    private String bloodType;
    private Integer age;
    private String gender;
}