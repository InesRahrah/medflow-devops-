package com.medflow.hospitalservice.dto;

import com.medflow.hospitalservice.entity.enums.EmploymentType;
import com.medflow.hospitalservice.entity.enums.StaffRole;
import com.medflow.hospitalservice.entity.enums.StaffStatus;
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
public class StaffResponse {

    private UUID id;
    private UUID userId;
    private String email;
    private String firstName;
    private String lastName;
    private UUID hospitalId;
    private UUID departmentId;
    private StaffRole role;
    private EmploymentType employmentType;
    private StaffStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
