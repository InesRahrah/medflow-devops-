package com.medflow.blogservice.service;

import com.medflow.blogservice.dto.AiChatResponse;
import com.medflow.blogservice.dto.AiRecommendationRequest;
import com.medflow.blogservice.dto.AiRecommendationResponse;

public interface AiService {
    AiRecommendationResponse recommendBlogs(AiRecommendationRequest request);
    AiChatResponse chat(Long blogId, String question);
}