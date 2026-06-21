package com.medflow.blogservice.service;

import com.medflow.blogservice.dto.BlogRequestDTO;
import com.medflow.blogservice.dto.BlogResponseDTO;
import java.util.List;

public interface BlogService {
    BlogResponseDTO createBlog(BlogRequestDTO request);
    BlogResponseDTO getBlogById(Long id);
    List<BlogResponseDTO> getAllBlogs();
    List<BlogResponseDTO> getBlogsByAuthor(String authorId);
    List<BlogResponseDTO> getBlogsByStatus(String status);
    List<BlogResponseDTO> searchBlogs(String keyword);
    BlogResponseDTO updateBlog(Long id, BlogRequestDTO request);
    void deleteBlog(Long id);
      
}
