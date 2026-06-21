package com.medflow.blogservice.service;

import com.medflow.blogservice.dto.CommentRequestDTO;
import com.medflow.blogservice.dto.CommentResponseDTO;
import com.medflow.blogservice.dto.ReactionSummaryDTO;
import com.medflow.blogservice.dto.RepostResponseDTO;
import com.medflow.blogservice.entity.enums.ReactionType;
import com.medflow.blogservice.entity.enums.Visibility;

import java.util.List;

public interface InteractionService {

    // ── Reactions ──────────────────────────────────────────
    ReactionSummaryDTO getReactions(Long blogId, String userId);
    ReactionSummaryDTO addOrUpdateReaction(Long blogId, String userId, ReactionType type);
    ReactionSummaryDTO removeReaction(Long blogId, String userId);

    // ── Comments ───────────────────────────────────────────
    CommentResponseDTO addComment(Long blogId, String userId, CommentRequestDTO dto);
    List<CommentResponseDTO> getComments(Long blogId);
    void deleteComment(Long commentId, String userId);

    // ── Reposts ────────────────────────────────────────────
    RepostResponseDTO repost(Long blogId, String patientId, Visibility visibility);
    RepostResponseDTO updateRepostVisibility(Long repostId, Visibility visibility);
    void removeRepost(Long blogId, String patientId);
    List<RepostResponseDTO> getPatientReposts(String patientId);
    boolean isReposted(Long blogId, String patientId);
    long countReposts(Long blogId);
}