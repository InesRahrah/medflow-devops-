package com.medflow.hospitalservice.dto;

import com.medflow.hospitalservice.entity.enums.EmploymentType;
import com.medflow.hospitalservice.entity.enums.StaffRole;
import com.medflow.hospitalservice.entity.enums.StaffStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminCreateStaffRequest {

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50, message = "First name must be between 2 and 50 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50, message = "Last name must be between 2 and 50 characters")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    private String password;

    private UUID departmentId;

    @NotNull(message = "Staff role is required")
    private StaffRole role;

    @NotNull(message = "Employment type is required")
    private EmploymentType employmentType;

    @Builder.Default
    private StaffStatus status = StaffStatus.ACTIVE;
}
