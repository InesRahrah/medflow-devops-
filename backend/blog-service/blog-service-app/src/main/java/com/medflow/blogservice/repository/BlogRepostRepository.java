package com.medflow.blogservice.repository;
import com.medflow.blogservice.entity.BlogRepost;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface BlogRepostRepository extends JpaRepository<BlogRepost, Long> {
    Optional<BlogRepost> findByBlogIdAndPatientId(Long blogId, String patientId);
    List<BlogRepost> findByPatientId(String patientId);
    boolean existsByBlogIdAndPatientId(Long blogId, String patientId);
    void deleteByBlogIdAndPatientId(Long blogId, String patientId);
    long countByBlogId(Long blogId);
}


