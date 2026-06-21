package com.medflow.blogservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

@Data
@AllArgsConstructor
public class AiRecommendationResponse {
    private List<BlogResponseDTO> recommendedBlogs;
    private String reasoning;
}