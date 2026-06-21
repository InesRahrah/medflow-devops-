package com.medflow.stockservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class AiService {

    @Value("${gemini.api.key}")
    private String geminiKey;

    @Value("${openrouter.api.key}")
    private String openRouterKey;

    private final RestTemplate restTemplate = new RestTemplate();

    // 🎯 MAIN METHOD
    public String askAI(String question) {

        // 🥇 1. Try Gemini first
        String geminiResponse = callGemini(question);

        if (geminiResponse != null) {
            return geminiResponse;
        }

        System.out.println("⚠️ Gemini failed → switching to OpenRouter...");

        // 🥈 2. Fallback OpenRouter
        String openRouterResponse = callOpenRouter(question);

        if (openRouterResponse != null) {
            return openRouterResponse;
        }

        // ❌ LAST fallback
        return "⚠️ AI is temporarily unavailable. Please try again later.";
    }

    // ============================
    // 🔥 GEMINI
    // ============================
    private String callGemini(String question) {

        List<String> models = List.of(
                "gemini-2.5-flash",
                "gemini-2.0-flash"
        );

        for (String model : models) {
            try {
                String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                        + model + ":generateContent?key=" + geminiKey;

                Map<String, Object> body = Map.of(
                        "contents", List.of(
                                Map.of(
                                        "parts", List.of(
                                                Map.of("text", question)
                                        )
                                )
                        )
                );

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<Map<String, Object>> request =
                        new HttpEntity<>(body, headers);

                ResponseEntity<Map> response =
                        restTemplate.postForEntity(url, request, Map.class);

                if (response.getBody() == null) continue;

                List candidates = (List) response.getBody().get("candidates");
                if (candidates == null || candidates.isEmpty()) continue;

                Map first = (Map) candidates.get(0);
                Map content = (Map) first.get("content");
                List parts = (List) content.get("parts");
                Map textPart = (Map) parts.get(0);

                return textPart.get("text").toString();

            } catch (Exception e) {
                System.out.println("❌ Gemini failed: " + model);
            }
        }

        return null;
    }

    // ============================
    // 🔥 OPENROUTER (FALLBACK)
    // ============================
    private String callOpenRouter(String question) {

        try {
            String url = "https://openrouter.ai/api/v1/chat/completions";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openRouterKey);

            headers.add("HTTP-Referer", "http://localhost:4200");
            headers.add("X-Title", "MedFlow AI");

            Map<String, Object> body = Map.of(
                    "model", "openai/gpt-3.5-turbo",
                    "messages", List.of(
                            Map.of("role", "user", "content", question)
                    )
            );

            HttpEntity<Map<String, Object>> request =
                    new HttpEntity<>(body, headers);

            ResponseEntity<Map> response =
                    restTemplate.postForEntity(url, request, Map.class);

            if (response.getBody() == null) return null;

            List choices = (List) response.getBody().get("choices");
            if (choices == null || choices.isEmpty()) return null;

            Map first = (Map) choices.get(0);
            Map message = (Map) first.get("message");

            return message.get("content").toString();

        } catch (Exception e) {
            System.out.println("❌ OpenRouter failed");
            return null;
        }
    }
}
