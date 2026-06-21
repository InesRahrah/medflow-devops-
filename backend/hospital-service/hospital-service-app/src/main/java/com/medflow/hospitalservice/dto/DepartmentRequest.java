package com.medflow.hospitalservice.dto;

import com.medflow.hospitalservice.entity.enums.DepartmentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentRequest {

    @NotBlank(message = "Department name is required")
    @Size(min = 6, max = 100, message = "Department name must be between 6 and 100 characters")
    private String name;

    private String description;

    private String color;

    private DepartmentStatus status;
}
