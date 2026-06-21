package com.medflow.blogservice.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medflow.blogservice.dto.BlogRequestDTO;
import com.medflow.blogservice.dto.BlogResponseDTO;
import com.medflow.blogservice.entity.Blog;
import com.medflow.blogservice.entity.enums.BlogStatus;
import com.medflow.blogservice.exception.BlogNotFoundException;
import com.medflow.blogservice.repository.BlogRepository;
import com.medflow.blogservice.service.BlogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BlogServiceImpl implements BlogService {

    private final BlogRepository blogRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public BlogResponseDTO createBlog(BlogRequestDTO request) {
        Blog blog = Blog.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .summary(request.getSummary())
                .authorId(request.getAuthorId())
                .authorName(request.getAuthorName())
                .category(request.getCategory())
                .coverImageUrl(request.getCoverImageUrl())
                .imageUrls(toJson(request.getImageUrls()))
                .videoUrls(toJson(request.getVideoUrls()))
                .attachmentUrls(toJson(request.getAttachmentUrls()))
                .referenceLinks(toJson(request.getReferenceLinks()))
                .status(request.getStatus() != null ? request.getStatus() : BlogStatus.DRAFT)
                .build();
        return toDTO(blogRepository.save(blog));
    }

    @Override
    public BlogResponseDTO getBlogById(Long id) {
        Blog blog = blogRepository.findById(id)
                .orElseThrow(() -> new BlogNotFoundException(id));
        blog.setViewCount(blog.getViewCount() + 1);
        return toDTO(blogRepository.save(blog));
    }

    @Override
    public List<BlogResponseDTO> getAllBlogs() {
        return blogRepository.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<BlogResponseDTO> getBlogsByAuthor(String authorId) {
        return blogRepository.findByAuthorId(authorId).stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<BlogResponseDTO> getBlogsByStatus(String status) {
        return blogRepository.findByStatus(BlogStatus.valueOf(status.toUpperCase()))
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<BlogResponseDTO> searchBlogs(String keyword) {
        return blogRepository.findByTitleContainingIgnoreCase(keyword)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public BlogResponseDTO updateBlog(Long id, BlogRequestDTO request) {
        Blog blog = blogRepository.findById(id)
                .orElseThrow(() -> new BlogNotFoundException(id));
        blog.setTitle(request.getTitle());
        blog.setContent(request.getContent());
        blog.setSummary(request.getSummary());
        blog.setCategory(request.getCategory());
        blog.setCoverImageUrl(request.getCoverImageUrl());
        blog.setImageUrls(toJson(request.getImageUrls()));
        blog.setVideoUrls(toJson(request.getVideoUrls()));
        blog.setAttachmentUrls(toJson(request.getAttachmentUrls()));
        blog.setReferenceLinks(toJson(request.getReferenceLinks()));
        if (request.getStatus() != null) blog.setStatus(request.getStatus());
        return toDTO(blogRepository.save(blog));
    }

    @Override
    public void deleteBlog(Long id) {
        if (!blogRepository.existsById(id)) throw new BlogNotFoundException(id);
        blogRepository.deleteById(id);
    }

    // ── Helpers ──────────────────────────────────────

    private String toJson(List<String> list) {
        if (list == null || list.isEmpty()) return null;
        try { return objectMapper.writeValueAsString(list); }
        catch (Exception e) { return null; }
    }

    private List<String> fromJson(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try { return objectMapper.readValue(json, new TypeReference<List<String>>() {}); }
        catch (Exception e) { return Collections.emptyList(); }
    }

    private BlogResponseDTO toDTO(Blog blog) {
        return BlogResponseDTO.builder()
                .id(blog.getId())
                .title(blog.getTitle())
                .content(blog.getContent())
                .summary(blog.getSummary())
                .authorId(blog.getAuthorId())
                .authorName(blog.getAuthorName())
                .category(blog.getCategory())
                .coverImageUrl(blog.getCoverImageUrl())
                .imageUrls(fromJson(blog.getImageUrls()))
                .videoUrls(fromJson(blog.getVideoUrls()))
                .attachmentUrls(fromJson(blog.getAttachmentUrls()))
                .referenceLinks(fromJson(blog.getReferenceLinks()))
                .status(blog.getStatus())
                .createdAt(blog.getCreatedAt())
                .updatedAt(blog.getUpdatedAt())
                .viewCount(blog.getViewCount())
                .build();
    }
}