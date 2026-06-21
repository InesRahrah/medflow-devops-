package com.medflow.blogservice.dto;

import lombok.Data;

@Data
public class AiChatRequest {
    private Long blogId;
    private String question;
}