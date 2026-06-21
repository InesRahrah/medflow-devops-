package com.medflow.hospitalservice.dto;

import com.medflow.hospitalservice.entity.enums.TaskStatus;
import lombok.Data;

@Data
public class TaskStatusUpdateRequest {
    private TaskStatus status;
}
