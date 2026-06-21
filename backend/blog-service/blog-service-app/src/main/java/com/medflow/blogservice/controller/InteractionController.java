package com.medflow.blogservice.controller;

import com.medflow.blogservice.dto.CommentRequestDTO;
import com.medflow.blogservice.dto.CommentResponseDTO;
import com.medflow.blogservice.dto.ReactionRequestDTO;
import com.medflow.blogservice.dto.ReactionSummaryDTO;
import com.medflow.blogservice.dto.RepostRequestDTO;
import com.medflow.blogservice.dto.RepostResponseDTO;
import com.medflow.blogservice.entity.enums.ReactionType;
import com.medflow.blogservice.service.InteractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class InteractionController {

    private final InteractionService interactionService;

    // ── Reactions ──────────────────────────────────────────────────────────────

    @GetMapping("/blogs/{blogId}/reactions")
    public ResponseEntity<ReactionSummaryDTO> getReactions(
            @PathVariable Long blogId,
            @RequestHeader(value = "X-User-Id", defaultValue = "") String userId) {
        return ResponseEntity.ok(interactionService.getReactions(blogId, userId));
    }

    @PostMapping("/blogs/{blogId}/reactions")
    public ResponseEntity<ReactionSummaryDTO> react(
            @PathVariable Long blogId,
            @RequestBody ReactionRequestDTO dto,
            @RequestHeader("X-User-Id") String userId) {
        ReactionType type = ReactionType.valueOf(dto.getType().toUpperCase());
        return ResponseEntity.ok(interactionService.addOrUpdateReaction(blogId, userId, type));
    }

    @DeleteMapping("/blogs/{blogId}/reactions")
    public ResponseEntity<ReactionSummaryDTO> removeReaction(
            @PathVariable Long blogId,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(interactionService.removeReaction(blogId, userId));
    }

    // ── Comments ───────────────────────────────────────────────────────────────

    @GetMapping("/blogs/{blogId}/comments")
    public ResponseEntity<List<CommentResponseDTO>> getComments(
            @PathVariable Long blogId) {
        return ResponseEntity.ok(interactionService.getComments(blogId));
    }

    @PostMapping("/blogs/{blogId}/comments")
    public ResponseEntity<CommentResponseDTO> addComment(
            @PathVariable Long blogId,
            @RequestBody CommentRequestDTO dto,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(interactionService.addComment(blogId, userId, dto));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long commentId,
            @RequestHeader("X-User-Id") String userId) {
        interactionService.deleteComment(commentId, userId);
        return ResponseEntity.noContent().build();
    }

    // ── Reposts ────────────────────────────────────────────────────────────────

    @PostMapping("/blogs/{blogId}/repost")
    public ResponseEntity<RepostResponseDTO> repost(
            @PathVariable Long blogId,
            @RequestBody RepostRequestDTO dto,
            @RequestHeader("X-User-Id") String patientId) {
        return ResponseEntity.ok(interactionService.repost(blogId, patientId, dto.getVisibility()));
    }

    @DeleteMapping("/blogs/{blogId}/repost")
    public ResponseEntity<Void> removeRepost(
            @PathVariable Long blogId,
            @RequestHeader("X-User-Id") String patientId) {
        interactionService.removeRepost(blogId, patientId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/blogs/{blogId}/repost/status")
    public ResponseEntity<Map<String, Object>> getRepostStatus(
            @PathVariable Long blogId,
            @RequestHeader(value = "X-User-Id", defaultValue = "") String patientId) {
        Map<String, Object> response = new HashMap<>();
        response.put("reposted", interactionService.isReposted(blogId, patientId));
        response.put("count",    interactionService.countReposts(blogId));
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/reposts/{repostId}/visibility")
    public ResponseEntity<RepostResponseDTO> updateVisibility(
            @PathVariable Long repostId,
            @RequestBody RepostRequestDTO dto) {
        return ResponseEntity.ok(interactionService.updateRepostVisibility(repostId, dto.getVisibility()));
    }

    @GetMapping("/reposts/patient/{patientId}")
    public ResponseEntity<List<RepostResponseDTO>> getPatientReposts(
            @PathVariable String patientId) {
        return ResponseEntity.ok(interactionService.getPatientReposts(patientId));
    }
}