package com.medflow.blogservice.controller;

import com.medflow.blogservice.dto.RepostRequestDTO;
import com.medflow.blogservice.dto.RepostResponseDTO;
import com.medflow.blogservice.service.BlogRepostService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reposts")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class BlogRepostController {

    private final BlogRepostService blogRepostService;

    // Toggle repost ON/OFF
    @PostMapping("/{blogId}/toggle")
    public ResponseEntity<Map<String, Object>> toggle(
            @PathVariable Long blogId,
            @RequestParam String patientId,
            @RequestBody(required = false) RepostRequestDTO dto) {

        if (dto == null) dto = new RepostRequestDTO();

        RepostResponseDTO result = blogRepostService.toggleRepost(blogId, patientId, dto);

        Map<String, Object> response = new HashMap<>();
        response.put("reposted", result != null);
        response.put("count", blogRepostService.countReposts(blogId));
        return ResponseEntity.ok(response);
    }

    // Get repost status for a specific patient + blog
    @GetMapping("/{blogId}/status")
    public ResponseEntity<Map<String, Object>> status(
            @PathVariable Long blogId,
            @RequestParam String patientId) {

        Map<String, Object> response = new HashMap<>();
        response.put("reposted", blogRepostService.isReposted(blogId, patientId));
        response.put("count", blogRepostService.countReposts(blogId));
        return ResponseEntity.ok(response);
    }

    // Get all reposts for a patient (for their profile page)
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<RepostResponseDTO>> getPatientReposts(
            @PathVariable String patientId) {
        return ResponseEntity.ok(blogRepostService.getPatientReposts(patientId));
    }
}