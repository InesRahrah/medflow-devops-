package com.medflow.blogservice.dto;

import com.medflow.blogservice.entity.enums.BlogStatus;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BlogResponseDTO {
    private Long id;
    private String title;
    private String content;
    private String summary;
    private String authorId;
    private String authorName;
    private String category;
    private String coverImageUrl;
    private List<String> imageUrls;
    private List<String> videoUrls;
    private List<String> attachmentUrls;
    private List<String> referenceLinks;
    private BlogStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private int viewCount;
}