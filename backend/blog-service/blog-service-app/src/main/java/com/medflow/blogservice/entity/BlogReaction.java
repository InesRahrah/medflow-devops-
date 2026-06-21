// BlogReaction.java
package com.medflow.blogservice.entity;

import com.medflow.blogservice.entity.enums.ReactionType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "blog_reactions",
    uniqueConstraints = @UniqueConstraint(columnNames = {"blog_id", "user_id"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class BlogReaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "blog_id", nullable = false)
    private Long blogId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReactionType type;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}