package com.medflow.hospitalservice.mapper;

import com.medflow.hospitalservice.dto.TaskResponse;
import com.medflow.hospitalservice.entity.Task;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class TaskMapper {

    public static TaskResponse toResponse(Task task) {
        if (task == null) return null;
        
        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .assignedStaffId(task.getAssignedStaff().getId())
                .staffName(task.getAssignedStaff().getFirstName() + " " + task.getAssignedStaff().getLastName())
                .status(task.getStatus())
                .priority(task.getPriority())
                .origin(task.getOrigin())
                .roomId(task.getRoomId())
                .patientId(task.getPatientId())
                .createdAt(task.getCreatedAt())
                .dueDate(task.getDueDate())
                .build();
    }

    public static List<TaskResponse> toResponseList(List<Task> tasks) {
        return tasks.stream()
                .map(TaskMapper::toResponse)
                .collect(Collectors.toList());
    }
}
