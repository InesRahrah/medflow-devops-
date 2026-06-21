package com.medflow.blogservice.repository;
import com.medflow.blogservice.entity.BlogComment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BlogCommentRepository extends JpaRepository<BlogComment, Long> {
    List<BlogComment> findByBlogIdOrderByCreatedAtDesc(Long blogId);
}
