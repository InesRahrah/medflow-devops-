// BlogRepost.java
package com.medflow.blogservice.entity;

import com.medflow.blogservice.entity.enums.Visibility;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "blog_reposts",
    uniqueConstraints = @UniqueConstraint(columnNames = {"blog_id", "patient_id"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class BlogRepost {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "blog_id", nullable = false)
    private Long blogId;

    @Column(name = "patient_id", nullable = false)
    private String patientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Visibility visibility;

    @Column(name = "reposted_at")
    private LocalDateTime repostedAt;

    @PrePersist
    protected void onCreate() {
        repostedAt = LocalDateTime.now();
        if (visibility == null) visibility = Visibility.PUBLIC;
    }
}