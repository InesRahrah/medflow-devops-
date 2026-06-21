package com.medflow.blogservice.service;

import com.medflow.blogservice.dto.RepostRequestDTO;
import com.medflow.blogservice.dto.RepostResponseDTO;
import com.medflow.blogservice.entity.BlogRepost;
import com.medflow.blogservice.entity.Blog;
import com.medflow.blogservice.repository.BlogRepostRepository;
import com.medflow.blogservice.repository.BlogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BlogRepostService {

    private final BlogRepostRepository repostRepository;
    private final BlogRepository blogRepository;

    @Transactional
    public RepostResponseDTO toggleRepost(Long blogId, String patientId, RepostRequestDTO dto) {
        // If already reposted → remove it (undo)
        if (repostRepository.existsByBlogIdAndPatientId(blogId, patientId)) {
            repostRepository.deleteByBlogIdAndPatientId(blogId, patientId);
            return null; // null = "unreposted"
        }

        // Blog must exist
        Blog blog = blogRepository.findById(blogId)
                .orElseThrow(() -> new RuntimeException("Blog not found: " + blogId));

        BlogRepost repost = BlogRepost.builder()
                .blogId(blogId)
                .patientId(patientId)
                .visibility(dto.getVisibility())
                .build();

        BlogRepost saved = repostRepository.save(repost);
        return toDTO(saved, blog);
    }

    public boolean isReposted(Long blogId, String patientId) {
        return repostRepository.existsByBlogIdAndPatientId(blogId, patientId);
    }

    public List<RepostResponseDTO> getPatientReposts(String patientId) {
        return repostRepository.findByPatientId(patientId).stream()
                .map(repost -> {
                    Blog blog = blogRepository.findById(repost.getBlogId()).orElse(null);
                    return toDTO(repost, blog);
                })
                .collect(Collectors.toList());
    }

    public long countReposts(Long blogId) {
        return repostRepository.countByBlogId(blogId);
    }

    private RepostResponseDTO toDTO(BlogRepost repost, Blog blog) {
        RepostResponseDTO dto = new RepostResponseDTO();
        dto.setId(repost.getId());
        dto.setBlogId(repost.getBlogId());
        dto.setPatientId(repost.getPatientId());
        dto.setVisibility(repost.getVisibility());
        dto.setRepostedAt(repost.getRepostedAt());
        if (blog != null) {
            dto.setBlogTitle(blog.getTitle());
            dto.setBlogSummary(blog.getSummary());
            dto.setAuthorId(blog.getAuthorId()); // adjust field name if different
        }
        return dto;
    }
}