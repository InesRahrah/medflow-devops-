package com.medflow.blogservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CommentResponseDTO {
    private Long id;
    private Long blogId;
    private String userId;
    private String userFullName;
    private String content;
    private LocalDateTime createdAt;
}