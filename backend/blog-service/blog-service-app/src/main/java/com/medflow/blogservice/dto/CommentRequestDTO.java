package com.medflow.blogservice.dto;

import lombok.Data;

@Data
public class CommentRequestDTO {
    private String content;
    private String userFullName;
}