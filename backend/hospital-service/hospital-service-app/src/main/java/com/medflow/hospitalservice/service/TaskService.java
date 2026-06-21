package com.medflow.hospitalservice.service;

import com.medflow.hospitalservice.dto.TaskRequest;
import com.medflow.hospitalservice.dto.TaskResponse;
import com.medflow.hospitalservice.dto.TaskStatusUpdateRequest;
import com.medflow.hospitalservice.entity.Staff;

import java.util.List;
import java.util.UUID;

public interface TaskService {
    TaskResponse create(TaskRequest request);
    TaskResponse createSystemTask(String title, String description, Staff staff, UUID roomId, UUID patientId);
    List<TaskResponse> getMyTasks(UUID userId);
    List<TaskResponse> getAllTasks();
    List<TaskResponse> getTasksByStaffId(UUID staffId);
    TaskResponse updateStatus(UUID taskId, UUID userId, TaskStatusUpdateRequest request);
    TaskResponse getById(UUID id);
}
