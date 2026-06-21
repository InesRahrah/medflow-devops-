package com.medflow.hospitalservice.service.impl;

import com.medflow.hospitalservice.dto.TaskRequest;
import com.medflow.hospitalservice.dto.TaskResponse;
import com.medflow.hospitalservice.dto.TaskStatusUpdateRequest;
import com.medflow.hospitalservice.entity.Staff;
import com.medflow.hospitalservice.entity.Task;
import com.medflow.hospitalservice.entity.enums.TaskOrigin;
import com.medflow.hospitalservice.entity.enums.TaskPriority;
import com.medflow.hospitalservice.entity.enums.TaskStatus;
import com.medflow.hospitalservice.exception.ResourceNotFoundException;
import com.medflow.hospitalservice.mapper.TaskMapper;
import com.medflow.hospitalservice.repository.StaffRepository;
import com.medflow.hospitalservice.repository.TaskRepository;
import com.medflow.hospitalservice.service.TaskService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {

    private final TaskRepository repository;
    private final StaffRepository staffRepository;

    @Override
    public TaskResponse create(TaskRequest request) {
        Staff staff = staffRepository.findById(request.getAssignedStaffId())
                .orElseThrow(() -> new ResourceNotFoundException("Staff not found with id: " + request.getAssignedStaffId()));

        Task task = Task.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .assignedStaff(staff)
                .status(request.getStatus() != null ? request.getStatus() : TaskStatus.PENDING)
                .priority(request.getPriority() != null ? request.getPriority() : TaskPriority.MEDIUM)
                .origin(request.getOrigin() != null ? request.getOrigin() : TaskOrigin.ADMIN)
                .roomId(request.getRoomId())
                .patientId(request.getPatientId())
                .dueDate(request.getDueDate())
                .build();

        return TaskMapper.toResponse(repository.save(task));
    }

    @Override
    public TaskResponse createSystemTask(String title, String description, Staff staff, UUID roomId, UUID patientId) {
        Task task = Task.builder()
                .title(title)
                .description(description)
                .assignedStaff(staff)
                .status(TaskStatus.PENDING)
                .priority(TaskPriority.MEDIUM)
                .origin(TaskOrigin.SYSTEM)
                .roomId(roomId)
                .patientId(patientId)
                .build();

        log.info("System Task Created: {} for Staff: {}", title, staff.getId());
        return TaskMapper.toResponse(repository.save(task));
    }

    @Override
    public List<TaskResponse> getMyTasks(UUID userId) {
        Staff staff = staffRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff profile not found for user: " + userId));
        
        return TaskMapper.toResponseList(repository.findByAssignedStaffOrderByCreatedAtDesc(staff));
    }

    @Override
    public List<TaskResponse> getAllTasks() {
        return TaskMapper.toResponseList(repository.findAllByOrderByCreatedAtDesc());
    }
    
    @Override
    public List<TaskResponse> getTasksByStaffId(UUID staffId) {
        return TaskMapper.toResponseList(repository.findByAssignedStaffIdOrderByCreatedAtDesc(staffId));
    }

    @Override
    public TaskResponse updateStatus(UUID taskId, UUID userId, TaskStatusUpdateRequest request) {
        Task task = repository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        if (!task.getAssignedStaff().getUserId().equals(userId)) {
            throw new SecurityException("You are not authorized to update this task.");
        }

        task.setStatus(request.getStatus());
        return TaskMapper.toResponse(repository.save(task));
    }

    @Override
    public TaskResponse getById(UUID id) {
        return repository.findById(id)
                .map(TaskMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));
    }
}
