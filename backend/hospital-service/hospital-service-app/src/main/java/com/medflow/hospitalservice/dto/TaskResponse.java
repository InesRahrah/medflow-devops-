package com.medflow.hospitalservice.dto;

import com.medflow.hospitalservice.entity.enums.TaskOrigin;
import com.medflow.hospitalservice.entity.enums.TaskPriority;
import com.medflow.hospitalservice.entity.enums.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {
    private UUID id;
    private String title;
    private String description;
    private UUID assignedStaffId;
    private String staffName;
    private TaskStatus status;
    private TaskPriority priority;
    private TaskOrigin origin;
    private UUID roomId;
    private UUID patientId;
    private LocalDateTime createdAt;
    private LocalDateTime dueDate;
}
