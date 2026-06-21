package com.medflow.blogservice.entity;

import com.medflow.blogservice.entity.enums.BlogStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "blogs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Blog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(length = 500)
    private String summary;

    @Column(nullable = false)
    private String authorId;

    private String authorName;
    private String category;
    private String coverImageUrl;

    @Column(columnDefinition = "TEXT")
    private String imageUrls;       // JSON array: ["url1","url2"]

    @Column(columnDefinition = "TEXT")
    private String videoUrls;       // JSON array: ["https://youtube.com/..."]

    @Column(columnDefinition = "TEXT")
    private String attachmentUrls;  // JSON array: ["https://...pdf"]

    @Column(columnDefinition = "TEXT")
    private String referenceLinks;  // JSON array: ["https://..."]

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BlogStatus status = BlogStatus.DRAFT;

    private int viewCount = 0;

    @Column(updatable = false)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}