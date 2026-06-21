package com.medflow.hospitalservice.controller;

import com.medflow.hospitalservice.dto.TaskRequest;
import com.medflow.hospitalservice.dto.TaskResponse;
import com.medflow.hospitalservice.dto.TaskStatusUpdateRequest;
import com.medflow.hospitalservice.security.AdminAuthorization;
import com.medflow.hospitalservice.security.JwtClaimsExtractor;
import com.medflow.hospitalservice.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final JwtClaimsExtractor jwtClaimsExtractor;

    @PostMapping
    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    public ResponseEntity<TaskResponse> createTask(@RequestBody TaskRequest request) {
        return new ResponseEntity<>(taskService.create(request), HttpStatus.CREATED);
    }

    @GetMapping("/me")
    public ResponseEntity<List<TaskResponse>> getMyTasks() {
        UUID userId = jwtClaimsExtractor.getUserId();
        return ResponseEntity.ok(taskService.getMyTasks(userId));
    }

    @GetMapping
    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    public ResponseEntity<List<TaskResponse>> getAllTasks() {
        return ResponseEntity.ok(taskService.getAllTasks());
    }
    
    @GetMapping("/staff/{staffId}")
    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    public ResponseEntity<List<TaskResponse>> getTasksByStaffId(@PathVariable UUID staffId) {
        return ResponseEntity.ok(taskService.getTasksByStaffId(staffId));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TaskResponse> updateTaskStatus(
            @PathVariable UUID id,
            @RequestBody TaskStatusUpdateRequest request) {
        UUID userId = jwtClaimsExtractor.getUserId();
        return ResponseEntity.ok(taskService.updateStatus(id, userId, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable UUID id) {
        return ResponseEntity.ok(taskService.getById(id));
    }
}
