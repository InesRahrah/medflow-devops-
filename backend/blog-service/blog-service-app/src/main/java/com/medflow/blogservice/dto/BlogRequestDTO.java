package com.medflow.blogservice.dto;

import com.medflow.blogservice.entity.enums.BlogStatus;
import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BlogRequestDTO {
    private String title;
    private String content;
    private String summary;
    private String authorId;
    private String authorName;
    private String category;
    private String coverImageUrl;
    private BlogStatus status;

    // New fields to add
    private List<String> imageUrls;      // extra images
    private List<String> videoUrls;      // YouTube/Vimeo links
    private List<String> attachmentUrls; // PDF/doc links
    private List<String> referenceLinks; // external reference URLs
}
