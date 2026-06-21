package com.medflow.blogservice.repository;

import com.medflow.blogservice.entity.Blog;
import com.medflow.blogservice.entity.enums.BlogStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BlogRepository extends JpaRepository<Blog, Long> {
    List<Blog> findByAuthorId(String authorId);
    List<Blog> findByStatus(BlogStatus status);
    List<Blog> findByCategory(String category);
    List<Blog> findByTitleContainingIgnoreCase(String keyword);
}
