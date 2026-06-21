package com.medflow.blogservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReactionSummaryDTO {
    private Map<String, Long> counts;
    private String userReaction;
    private long total;
}