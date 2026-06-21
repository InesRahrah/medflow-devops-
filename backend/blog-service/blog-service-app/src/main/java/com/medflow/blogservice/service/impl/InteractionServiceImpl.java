package com.medflow.blogservice.service.impl;

import com.medflow.blogservice.dto.CommentRequestDTO;
import com.medflow.blogservice.dto.CommentResponseDTO;
import com.medflow.blogservice.dto.ReactionSummaryDTO;
import com.medflow.blogservice.dto.RepostResponseDTO;
import com.medflow.blogservice.entity.BlogComment;
import com.medflow.blogservice.entity.BlogReaction;
import com.medflow.blogservice.entity.BlogRepost;
import com.medflow.blogservice.entity.enums.ReactionType;
import com.medflow.blogservice.entity.enums.Visibility;
import com.medflow.blogservice.repository.BlogCommentRepository;
import com.medflow.blogservice.repository.BlogReactionRepository;
import com.medflow.blogservice.repository.BlogRepository;
import com.medflow.blogservice.repository.BlogRepostRepository;
import com.medflow.blogservice.service.InteractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class InteractionServiceImpl implements InteractionService {

    private final BlogReactionRepository reactionRepo;
    private final BlogCommentRepository commentRepo;
    private final BlogRepostRepository repostRepo;
    private final BlogRepository blogRepo;

    // ── Reactions ──────────────────────────────────────────────────────────────

    @Override
    public ReactionSummaryDTO getReactions(Long blogId, String userId) {
        List<BlogReaction> reactions = reactionRepo.findByBlogId(blogId);

        Map<String, Long> counts = new HashMap<>();
        for (ReactionType t : ReactionType.values()) {
            long c = reactions.stream().filter(r -> r.getType() == t).count();
            if (c > 0) counts.put(t.name(), c);
        }

        String userReaction = reactions.stream()
            .filter(r -> r.getUserId().equals(userId))
            .map(r -> r.getType().name())
            .findFirst()
            .orElse(null);

        return new ReactionSummaryDTO(counts, userReaction, reactions.size());
    }

    @Override
    public ReactionSummaryDTO addOrUpdateReaction(Long blogId, String userId, ReactionType type) {
        BlogReaction reaction = reactionRepo.findByBlogIdAndUserId(blogId, userId)
            .orElse(BlogReaction.builder().blogId(blogId).userId(userId).build());
        reaction.setType(type);
        reactionRepo.save(reaction);
        return getReactions(blogId, userId);
    }

    @Override
    public ReactionSummaryDTO removeReaction(Long blogId, String userId) {
        reactionRepo.deleteByBlogIdAndUserId(blogId, userId);
        return getReactions(blogId, userId);
    }

    // ── Comments ───────────────────────────────────────────────────────────────

    @Override
    public CommentResponseDTO addComment(Long blogId, String userId, CommentRequestDTO dto) {
        BlogComment c = commentRepo.save(
            BlogComment.builder()
                .blogId(blogId)
                .userId(userId)
                .userFullName(dto.getUserFullName())
                .content(dto.getContent())
                .build()
        );
        return new CommentResponseDTO(
            c.getId(), c.getBlogId(), c.getUserId(),
            c.getUserFullName(), c.getContent(), c.getCreatedAt()
        );
    }

    @Override
    public List<CommentResponseDTO> getComments(Long blogId) {
        return commentRepo.findByBlogIdOrderByCreatedAtDesc(blogId).stream()
            .map(c -> new CommentResponseDTO(
                c.getId(), c.getBlogId(), c.getUserId(),
                c.getUserFullName(), c.getContent(), c.getCreatedAt()
            ))
            .collect(Collectors.toList());
    }

    @Override
    public void deleteComment(Long commentId, String userId) {
        commentRepo.findById(commentId)
            .filter(c -> c.getUserId().equals(userId))
            .ifPresent(commentRepo::delete);
    }

    // ── Reposts ────────────────────────────────────────────────────────────────

    @Override
    public RepostResponseDTO repost(Long blogId, String patientId, Visibility visibility) {
        BlogRepost r = repostRepo.findByBlogIdAndPatientId(blogId, patientId)
            .orElse(BlogRepost.builder().blogId(blogId).patientId(patientId).build());
        r.setVisibility(visibility != null ? visibility : Visibility.PUBLIC);
        return mapRepost(repostRepo.save(r));
    }

    @Override
    public RepostResponseDTO updateRepostVisibility(Long repostId, Visibility visibility) {
        BlogRepost r = repostRepo.findById(repostId)
            .orElseThrow(() -> new RuntimeException("Repost not found"));
        r.setVisibility(visibility);
        return mapRepost(repostRepo.save(r));
    }

    @Override
    public void removeRepost(Long blogId, String patientId) {
        repostRepo.deleteByBlogIdAndPatientId(blogId, patientId);
    }

    @Override
    public List<RepostResponseDTO> getPatientReposts(String patientId) {
        return repostRepo.findByPatientId(patientId).stream()
            .map(this::mapRepost)
            .collect(Collectors.toList());
    }

    @Override
    public boolean isReposted(Long blogId, String patientId) {
        return repostRepo.existsByBlogIdAndPatientId(blogId, patientId);
    }

    @Override
    public long countReposts(Long blogId) {
        return repostRepo.countByBlogId(blogId);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private RepostResponseDTO mapRepost(BlogRepost r) {
        RepostResponseDTO dto = new RepostResponseDTO();
        dto.setId(r.getId());
        dto.setBlogId(r.getBlogId());
        dto.setPatientId(r.getPatientId());
        dto.setVisibility(r.getVisibility());
        dto.setRepostedAt(r.getRepostedAt());
        dto.setBlogTitle("Untitled");
        dto.setBlogSummary("");
        dto.setBlogAuthorName("Unknown");
        dto.setAuthorId(null);

        blogRepo.findById(r.getBlogId()).ifPresent(b -> {
            dto.setBlogTitle(b.getTitle() != null ? b.getTitle() : "Untitled");
            dto.setBlogSummary(
                b.getSummary() != null ? b.getSummary() :
                (b.getContent() != null && b.getContent().length() > 150
                    ? b.getContent().substring(0, 150) + "..."
                    : b.getContent() != null ? b.getContent() : "")
            );
            dto.setBlogAuthorName(b.getAuthorName() != null ? b.getAuthorName() : "Unknown");
            dto.setAuthorId(b.getAuthorId());
        });

        return dto;
    }
}