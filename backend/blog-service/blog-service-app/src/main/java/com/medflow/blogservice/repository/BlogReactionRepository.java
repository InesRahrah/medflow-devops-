package com.medflow.blogservice.repository;
import com.medflow.blogservice.entity.BlogReaction;
import com.medflow.blogservice.entity.enums.ReactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface BlogReactionRepository extends JpaRepository<BlogReaction, Long> {
    Optional<BlogReaction> findByBlogIdAndUserId(Long blogId, String userId);
    List<BlogReaction> findByBlogId(Long blogId);
    void deleteByBlogIdAndUserId(Long blogId, String userId);
}
