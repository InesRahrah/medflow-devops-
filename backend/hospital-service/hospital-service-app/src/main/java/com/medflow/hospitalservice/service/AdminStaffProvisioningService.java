package com.medflow.hospitalservice.service;

import com.medflow.hospitalservice.dto.AdminCreateStaffRequest;
import com.medflow.hospitalservice.dto.AdminCreateStaffResponse;
import com.medflow.hospitalservice.dto.StaffResponse;
import com.medflow.hospitalservice.dto.integration.CreateStaffUserRequest;
import com.medflow.hospitalservice.dto.integration.CreateStaffUserResponse;
import com.medflow.hospitalservice.entity.Department;
import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.entity.Staff;
import com.medflow.hospitalservice.exception.BadRequestException;
import com.medflow.hospitalservice.mapper.StaffMapper;
import com.medflow.hospitalservice.service.integration.UserProvisioningClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminStaffProvisioningService {

    private final StaffService staffService;
    private final DepartmentService departmentService;
    private final UserProvisioningClient userProvisioningClient;

    public AdminCreateStaffResponse createStaffWithUser(AdminCreateStaffRequest request, Hospital hospital,
            String authorizationHeader) {
        Department department = request.getDepartmentId() != null
                ? departmentService.getByIdAndHospital(request.getDepartmentId(), hospital)
                : null;

        CreateStaffUserResponse createdUser = userProvisioningClient.createStaffAccount(
                authorizationHeader,
                CreateStaffUserRequest.builder()
                        .email(request.getEmail())
                        .password(request.getPassword())
                        .build());

        if (createdUser == null || createdUser.getUserId() == null) {
            throw new BadRequestException("User service did not return a valid user account.");
        }

        UUID createdUserId = createdUser.getUserId();

        try {
            Staff staff = staffService.create(Staff.builder()
                    .userId(createdUserId)
                    .firstName(request.getFirstName().trim())
                    .lastName(request.getLastName().trim())
                    .hospital(hospital)
                    .department(department)
                    .role(request.getRole())
                    .employmentType(request.getEmploymentType())
                    .status(request.getStatus())
                    .build());

            StaffResponse staffResponse = StaffMapper.toResponse(staff);
            return AdminCreateStaffResponse.builder()
                    .staff(staffResponse)
                    .passwordGenerated(createdUser.isPasswordGenerated())
                    .generatedPassword(createdUser.getGeneratedPassword())
                    .build();
        } catch (Exception exception) {
            try {
                userProvisioningClient.deleteUser(authorizationHeader, createdUserId);
            } catch (Exception rollbackException) {
                log.error("Failed to rollback user {} after staff creation failure", createdUserId, rollbackException);
            }
            throw exception;
        }
    }
}
