package com.medflow.blogservice.controller;

import com.medflow.blogservice.dto.BlogRequestDTO;
import com.medflow.blogservice.dto.BlogResponseDTO;
import com.medflow.blogservice.service.BlogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/blogs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BlogController {

    private final BlogService blogService;

    @PostMapping
    public ResponseEntity<BlogResponseDTO> create(@RequestBody BlogRequestDTO request) {
        return ResponseEntity.ok(blogService.createBlog(request));
    }

    @GetMapping
    public ResponseEntity<List<BlogResponseDTO>> getAll() {
        return ResponseEntity.ok(blogService.getAllBlogs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BlogResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(blogService.getBlogById(id));
    }

    @GetMapping("/author/{authorId}")
    public ResponseEntity<List<BlogResponseDTO>> getByAuthor(@PathVariable String authorId) {
        return ResponseEntity.ok(blogService.getBlogsByAuthor(authorId));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<BlogResponseDTO>> getByStatus(@PathVariable String status) {
        return ResponseEntity.ok(blogService.getBlogsByStatus(status));
    }

    @GetMapping("/search")
    public ResponseEntity<List<BlogResponseDTO>> search(@RequestParam String keyword) {
        return ResponseEntity.ok(blogService.searchBlogs(keyword));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BlogResponseDTO> update(@PathVariable Long id, @RequestBody BlogRequestDTO request) {
        return ResponseEntity.ok(blogService.updateBlog(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        blogService.deleteBlog(id);
        return ResponseEntity.noContent().build();
    }
}