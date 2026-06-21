package com.medflow.blogservice.controller;

import com.medflow.blogservice.dto.*;
import com.medflow.blogservice.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/blogs/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AiController {

    private final AiService aiService;

    // POST /api/v1/blogs/ai/recommend
    @PostMapping("/recommend")
    public ResponseEntity<AiRecommendationResponse> recommend(
            @RequestBody AiRecommendationRequest request) {
        return ResponseEntity.ok(aiService.recommendBlogs(request));
    }

    // POST /api/v1/blogs/ai/chat
    @PostMapping("/chat")
    public ResponseEntity<AiChatResponse> chat(
            @RequestBody AiChatRequest request) {
        return ResponseEntity.ok(aiService.chat(request.getBlogId(), request.getQuestion()));
    }
}