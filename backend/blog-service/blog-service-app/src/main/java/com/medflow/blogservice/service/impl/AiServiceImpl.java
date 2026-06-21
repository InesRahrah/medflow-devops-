package com.medflow.blogservice.service.impl;

import com.medflow.blogservice.dto.*;
import com.medflow.blogservice.entity.Blog;
import com.medflow.blogservice.entity.enums.BlogStatus;
import com.medflow.blogservice.repository.BlogRepository;
import com.medflow.blogservice.service.AiService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AiServiceImpl implements AiService {

    private final ChatClient chatClient;
    private final BlogRepository blogRepository;

    public AiServiceImpl(ChatClient.Builder builder, BlogRepository blogRepository) {
        this.chatClient = builder.build();
        this.blogRepository = blogRepository;
    }

    @Override
    public AiRecommendationResponse recommendBlogs(AiRecommendationRequest request) {
        // 1. Fetch all published blogs
        List<Blog> publishedBlogs = blogRepository.findByStatus(BlogStatus.PUBLISHED);

        if (publishedBlogs.isEmpty()) {
            return new AiRecommendationResponse(new ArrayList<>(), "No published blogs available.");
        }

        // 2. Build blog list summary for the prompt
        String blogList = publishedBlogs.stream()
            .map(b -> String.format("ID:%d | Title: %s | Category: %s | Summary: %s",
                b.getId(), b.getTitle(), b.getCategory(), b.getSummary()))
            .collect(Collectors.joining("\n"));

        // 3. Build patient profile summary
        String profile = String.format(
            "Age: %s, Gender: %s, Blood Type: %s, Chronic Diseases: %s, Allergies: %s",
            request.getAge(),
            request.getGender(),
            request.getBloodType(),
            request.getChronicDiseases() != null ? String.join(", ", request.getChronicDiseases()) : "None",
            request.getAllergies() != null ? String.join(", ", request.getAllergies()) : "None"
        );

        // 4. Build the AI prompt
        String prompt = String.format("""
            You are a medical content advisor. Given the patient's health profile below,
            recommend the top 3 most relevant blog articles from the list provided.
            
            Patient Profile:
            %s
            
            Available Blogs:
            %s
            
            Instructions:
            - Return ONLY the IDs of the top 3 most relevant blogs, separated by commas.
            - Format: RECOMMENDED_IDS: 1,5,12
            - Then on a new line provide a brief reason: REASON: [your explanation]
            - Only include IDs from the list above.
            """, profile, blogList);

        // 5. Call Ollama
        String aiResponse = chatClient.prompt()
            .user(prompt)
            .call()
            .content();

        log.info("AI Recommendation Response: {}", aiResponse);

        // 6. Parse the response
        List<BlogResponseDTO> recommended = parseRecommendedBlogs(aiResponse, publishedBlogs);
        String reasoning = parseReasoning(aiResponse);

        return new AiRecommendationResponse(recommended, reasoning);
    }

    @Override
    public AiChatResponse chat(Long blogId, String question) {
        // 1. Fetch the blog
        Blog blog = blogRepository.findById(blogId)
            .orElseThrow(() -> new RuntimeException("Blog not found with id: " + blogId));

        // 2. Build the prompt
        String prompt = String.format("""
            You are a helpful medical assistant. Based on the following article, 
            answer the patient's question clearly and concisely.
            
            Article Title: %s
            Article Content:
            %s
            
            Patient Question: %s
            
            Provide a helpful, accurate answer based only on the article content.
            If the answer is not in the article, say so politely.
            """, blog.getTitle(), blog.getContent(), question);

        // 3. Call Ollama
        String answer = chatClient.prompt()
            .user(prompt)
            .call()
            .content();

        return new AiChatResponse(answer);
    }

    // --- Helpers ---

    private List<BlogResponseDTO> parseRecommendedBlogs(String aiResponse, List<Blog> allBlogs) {
        try {
            String idLine = aiResponse.lines()
                .filter(l -> l.toUpperCase().contains("RECOMMENDED_IDS:"))
                .findFirst()
                .orElse("");

            String[] ids = idLine.replaceAll("(?i)RECOMMENDED_IDS:", "").trim().split(",");

            return java.util.Arrays.stream(ids)
                .map(String::trim)
                .map(id -> {
                    try { return Long.parseLong(id); } catch (Exception e) { return -1L; }
                })
                .filter(id -> id > 0)
                .flatMap(id -> allBlogs.stream().filter(b -> b.getId().equals(id)))
                .map(this::mapToDTO)
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error parsing AI recommendation response", e);
            return new ArrayList<>();
        }
    }

    private String parseReasoning(String aiResponse) {
        return aiResponse.lines()
            .filter(l -> l.toUpperCase().contains("REASON:"))
            .findFirst()
            .map(l -> l.replaceAll("(?i)REASON:", "").trim())
            .orElse("Based on your health profile.");
    }

    private BlogResponseDTO mapToDTO(Blog blog) {
        BlogResponseDTO dto = new BlogResponseDTO();
        dto.setId(blog.getId());
        dto.setTitle(blog.getTitle());
        dto.setSummary(blog.getSummary());
        dto.setCategory(blog.getCategory());
        dto.setAuthorName(blog.getAuthorName());
        dto.setCoverImageUrl(blog.getCoverImageUrl());
        dto.setStatus(blog.getStatus());
        dto.setCreatedAt(blog.getCreatedAt());
        return dto;
    }
}