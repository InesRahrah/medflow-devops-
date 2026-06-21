package com.medflow.blogservice.dto;

import com.medflow.blogservice.entity.enums.Visibility;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RepostResponseDTO {
    private Long id;
    private Long blogId;
    private String patientId;
    private Visibility visibility;
    private LocalDateTime repostedAt;
    private String blogTitle;
    private String blogSummary;
    private String authorId;
    private String blogAuthorName;
}