package com.medflow.hospitalservice.controller;

import com.medflow.hospitalservice.dto.AdminCreateStaffRequest;
import com.medflow.hospitalservice.dto.AdminCreateStaffResponse;
import com.medflow.hospitalservice.dto.StaffDetailResponse;
import com.medflow.hospitalservice.dto.StaffJwtInfoResponse;
import com.medflow.hospitalservice.dto.StaffRoomAssignmentRequest;
import com.medflow.hospitalservice.dto.StaffRequest;
import com.medflow.hospitalservice.dto.StaffResponse;
import com.medflow.hospitalservice.entity.Department;
import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.mapper.StaffMapper;
import com.medflow.hospitalservice.mapper.RoomMapper;
import com.medflow.hospitalservice.service.DepartmentService;
import com.medflow.hospitalservice.service.HospitalService;
import com.medflow.hospitalservice.service.AdminStaffProvisioningService;
import com.medflow.hospitalservice.service.StaffService;
import com.medflow.hospitalservice.service.integration.UserProvisioningClient;
import com.medflow.hospitalservice.dto.integration.UserInfoResponse;
import com.medflow.hospitalservice.security.AdminAuthorization;
import com.medflow.hospitalservice.security.JwtClaimsExtractor;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import jakarta.servlet.http.HttpServletRequest;

@Slf4j
@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
public class StaffController {

    private final StaffService staffService;
    private final HospitalService hospitalService;
    private final DepartmentService departmentService;
    private final AdminStaffProvisioningService adminStaffProvisioningService;
    private final UserProvisioningClient userProvisioningClient;
    private final JwtClaimsExtractor jwtClaimsExtractor;

    private UUID getAuthenticatedUserId() {
        String userIdStr = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return UUID.fromString(userIdStr);
    }

    private Hospital getAuthenticatedHospital() {
        UUID hospitalId = jwtClaimsExtractor.getRequiredHospitalId();
        return hospitalService.getById(hospitalId);
    }

    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    @PostMapping
    public ResponseEntity<StaffResponse> create(@Valid @RequestBody StaffRequest request) {
        Hospital hospital = getAuthenticatedHospital();
        Department department = request.getDepartmentId() != null
                ? departmentService.getByIdAndHospital(request.getDepartmentId(), hospital)
                : null;

        StaffResponse response = StaffMapper.toResponse(
                staffService.create(StaffMapper.toEntity(request, hospital, department)));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    @PostMapping("/admin/create")
    public ResponseEntity<AdminCreateStaffResponse> createByAdmin(
            @Valid @RequestBody AdminCreateStaffRequest request,
            HttpServletRequest httpRequest) {
        Hospital hospital = getAuthenticatedHospital();
        String authorizationHeader = httpRequest.getHeader("Authorization");

        AdminCreateStaffResponse response = adminStaffProvisioningService.createStaffWithUser(
                request,
                hospital,
                authorizationHeader);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PreAuthorize("hasAnyRole('STAFF_ADMIN','HOSPITAL','DOCTOR','NURSE')")
    @GetMapping
    public ResponseEntity<List<StaffResponse>> getAll() {
        Hospital hospital = getAuthenticatedHospital();
        List<StaffResponse> response = staffService.getByHospital(hospital).stream()
                .map(StaffMapper::toResponse)
                .map(this::enrichStaffResponseWithUserInfo)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('STAFF_ADMIN','HOSPITAL','DOCTOR','NURSE')")
    @GetMapping("/{id}")
    public ResponseEntity<StaffResponse> getById(@PathVariable UUID id) {
        StaffResponse response = enrichStaffResponseWithUserInfo(StaffMapper.toResponse(staffService.getById(id)));
        return ResponseEntity.ok(response);
    }

    // TODO(security): This internal endpoint is intentionally kept
    // behavior-compatible for now.
    // Restrict with service-to-service authentication in a dedicated hardening
    // pass.
    @GetMapping("/internal/by-user/{userId}")
    public ResponseEntity<StaffJwtInfoResponse> getByUserId(@PathVariable UUID userId) {
        return staffService.getByUserId(userId)
                .map(staff -> ResponseEntity.ok(StaffJwtInfoResponse.builder()
                        .userId(staff.getUserId())
                        .hospitalId(staff.getHospital() != null ? staff.getHospital().getId() : null)
                        .role(staff.getRole())
                        .build()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PreAuthorize("hasAnyRole('STAFF_ADMIN','HOSPITAL','DOCTOR','NURSE')")
    @GetMapping("/{id}/detail")
    public ResponseEntity<StaffDetailResponse> getDetail(@PathVariable UUID id) {
        Hospital hospital = getAuthenticatedHospital();
        StaffDetailResponse detail = staffService.getDetail(id, hospital);
        if (detail != null && detail.getStaff() != null) {
            detail.setStaff(enrichStaffResponseWithUserInfo(detail.getStaff()));
        }
        return ResponseEntity.ok(detail);
    }

    @PreAuthorize("hasAnyRole('STAFF_ADMIN','HOSPITAL','DOCTOR','NURSE')")
    @GetMapping("/me")
    public ResponseEntity<List<StaffResponse>> getMyStaff() {
        Hospital hospital = getAuthenticatedHospital();
        List<StaffResponse> response = staffService.getByHospital(hospital).stream()
                .map(staff -> {
                    StaffResponse staffResponse = StaffMapper.toResponse(staff);
                    return enrichStaffResponseWithUserInfo(staffResponse);
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    @PutMapping("/{id}")
    public ResponseEntity<StaffResponse> update(@PathVariable UUID id, @Valid @RequestBody StaffRequest request) {
        Hospital hospital = getAuthenticatedHospital();
        Department department = request.getDepartmentId() != null
                ? departmentService.getByIdAndHospital(request.getDepartmentId(), hospital)
                : null;

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            userProvisioningClient.updateUserEmail(request.getUserId(), request.getEmail());
        }

        StaffResponse response = StaffMapper.toResponse(
                staffService.update(id, StaffMapper.toEntity(request, hospital, department), hospital));
        return ResponseEntity.ok(enrichStaffResponseWithUserInfo(response));
    }

    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    @PutMapping("/{id}/assignments/rooms")
    public ResponseEntity<List<com.medflow.hospitalservice.dto.RoomResponse>> assignRooms(
            @PathVariable UUID id,
            @Valid @RequestBody StaffRoomAssignmentRequest request) {
        Hospital hospital = getAuthenticatedHospital();

        return ResponseEntity.ok(staffService.assignRooms(id, hospital, request.getRoomIds())
                .stream()
                .map(RoomMapper::toResponse)
                .collect(Collectors.toList()));
    }

    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, HttpServletRequest request) {
        Hospital hospital = getAuthenticatedHospital();
        String authorizationHeader = request.getHeader("Authorization");
        staffService.delete(id, hospital, authorizationHeader);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasRole('NURSE')")
    @GetMapping("/me/rooms")
    public ResponseEntity<List<com.medflow.hospitalservice.dto.NurseRoomResponse>> getMyRooms() {
        UUID userId = getAuthenticatedUserId();
        log.info("Assigned Rooms Trace: Fetching rooms for userId={}", userId);
        List<com.medflow.hospitalservice.entity.Room> rooms = staffService.getRoomsForCurrentStaff(userId);

        List<com.medflow.hospitalservice.dto.NurseRoomResponse> response = rooms.stream()
                .map(room -> com.medflow.hospitalservice.dto.NurseRoomResponse.builder()
                        .id(room.getId())
                        .roomNumber(room.getRoomNumber())
                        .status(room.getStatus())
                        .departmentName(room.getDepartment() != null ? room.getDepartment().getName() : "N/A")
                        .floorName(room.getFloor() != null ? room.getFloor().getName() : "N/A")
                        .capacity(room.getCapacity())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    private StaffResponse enrichStaffResponseWithUserInfo(StaffResponse staffResponse) {
        if (staffResponse == null || staffResponse.getUserId() == null) {
            return staffResponse;
        }

        try {
            UserInfoResponse userInfo = userProvisioningClient.getUserInfo(staffResponse.getUserId());
            if (userInfo == null) {
                return staffResponse;
            }

            if (userInfo.getEmail() != null && !userInfo.getEmail().isBlank()) {
                staffResponse.setEmail(userInfo.getEmail());
            }

            if ((staffResponse.getFirstName() == null || staffResponse.getFirstName().isBlank())
                    && userInfo.getFirstName() != null && !userInfo.getFirstName().isBlank()) {
                staffResponse.setFirstName(userInfo.getFirstName());
            }

            if ((staffResponse.getLastName() == null || staffResponse.getLastName().isBlank())
                    && userInfo.getLastName() != null && !userInfo.getLastName().isBlank()) {
                staffResponse.setLastName(userInfo.getLastName());
            }
        } catch (Exception ignored) {
            // Keep staff response even when user-service enrichment is unavailable.
        }

        return staffResponse;
    }
}
