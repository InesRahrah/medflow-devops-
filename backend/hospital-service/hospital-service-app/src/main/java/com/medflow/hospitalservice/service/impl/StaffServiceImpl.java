package com.medflow.hospitalservice.service.impl;

import com.medflow.hospitalservice.dto.StaffAssignedRoomResponse;
import com.medflow.hospitalservice.dto.StaffDetailResponse;
import com.medflow.hospitalservice.entity.Department;
import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.entity.Room;
import com.medflow.hospitalservice.entity.Staff;
import com.medflow.hospitalservice.exception.BadRequestException;
import com.medflow.hospitalservice.exception.ResourceNotFoundException;
import com.medflow.hospitalservice.mapper.StaffMapper;
import com.medflow.hospitalservice.repository.RoomRepository;
import com.medflow.hospitalservice.repository.StaffRepository;
import com.medflow.hospitalservice.security.JwtClaimsExtractor;
import com.medflow.hospitalservice.service.StaffService;
import com.medflow.hospitalservice.service.TaskService;
import com.medflow.hospitalservice.service.integration.UserProvisioningClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StaffServiceImpl implements StaffService {

    private final StaffRepository repository;
    private final RoomRepository roomRepository;
    private final JwtClaimsExtractor jwtClaimsExtractor;
    private final UserProvisioningClient userProvisioningClient;
    private final TransactionTemplate transactionTemplate;
    private final TaskService taskService;

    @Override
    public Staff create(Staff staff) {
        Staff saved = repository.save(staff);
        if (saved.getRole() == com.medflow.hospitalservice.entity.enums.StaffRole.NURSE || 
            saved.getRole() == com.medflow.hospitalservice.entity.enums.StaffRole.DOCTOR) {
            autoAssignStaff(saved);
        }
        return saved;
    }

    @Override
    public List<Staff> getAll() {
        return repository.findAll();
    }

    @Override
    public List<Staff> getByHospital(Hospital hospital) {
        return repository.findByHospital(hospital);
    }

    @Override
    public List<Staff> getByDepartment(Department department) {
        return repository.findByDepartment(department);
    }

    @Override
    public Staff getById(UUID id) {
        UUID hospitalId = jwtClaimsExtractor.getHospitalId();
        if (hospitalId == null) {
            throw new SecurityException("HospitalId not found in token. Access denied.");
        }

        return repository.findByIdAndHospitalId(id, hospitalId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff not found with id: " + id));
    }

    @Override
    public Optional<Staff> getByUserId(UUID userId) {
        return repository.findByUserId(userId);
    }

    @Override
    public Staff getByIdAndHospital(UUID id, Hospital hospital) {
        return repository.findByIdAndHospital(id, hospital)
                .orElseThrow(() -> new ResourceNotFoundException("Staff not found with id: " + id));
    }

    @Override
    public Staff update(UUID id, Staff staff) {
        Staff existing = getById(id);
        existing.setUserId(staff.getUserId());
        existing.setFirstName(staff.getFirstName());
        existing.setLastName(staff.getLastName());
        existing.setHospital(staff.getHospital());
        existing.setDepartment(staff.getDepartment());
        existing.setRole(staff.getRole());
        existing.setEmploymentType(staff.getEmploymentType());
        existing.setStatus(staff.getStatus());
        return repository.save(existing);
    }

    @Override
    public Staff update(UUID id, Staff staff, Hospital hospital) {
        Staff existing = getByIdAndHospital(id, hospital);
        existing.setUserId(staff.getUserId());
        existing.setFirstName(staff.getFirstName());
        existing.setLastName(staff.getLastName());
        existing.setHospital(hospital);
        existing.setDepartment(staff.getDepartment());
        existing.setRole(staff.getRole());
        existing.setEmploymentType(staff.getEmploymentType());
        existing.setStatus(staff.getStatus());
        return repository.save(existing);
    }

    @Override
    public void delete(UUID id) {
        UUID hospitalId = jwtClaimsExtractor.getHospitalId();
        if (hospitalId == null) {
            throw new SecurityException("HospitalId not found in token. Access denied.");
        }

        UUID userId = transactionTemplate.execute(status -> {
            Staff staff = repository.findByIdAndHospitalId(id, hospitalId)
                    .orElseThrow(() -> new ResourceNotFoundException("Staff not found with id: " + id));
            return deleteStaffWithCleanup(staff);
        });

        deleteUserAfterStaffCommit(userId, null);
    }

    @Override
    public void delete(UUID id, Hospital hospital) {
        delete(id, hospital, null);
    }

    @Override
    public void delete(UUID id, Hospital hospital, String authorizationHeader) {
        UUID userId = transactionTemplate.execute(status -> {
            Staff staff = getByIdAndHospital(id, hospital);
            return deleteStaffWithCleanup(staff);
        });

        deleteUserAfterStaffCommit(userId, authorizationHeader);
    }

    @Override
    public StaffDetailResponse getDetail(UUID id, Hospital hospital) {
        Staff staff = getByIdAndHospital(id, hospital);
        List<Room> assignedRooms = roomRepository.findByAssignedStaff(staff);

        List<StaffAssignedRoomResponse> roomResponses = assignedRooms.stream()
                .map(room -> StaffAssignedRoomResponse.builder()
                        .roomId(room.getId())
                        .roomNumber(room.getRoomNumber())
                        .roomStatus(room.getStatus())
                        .floorId(room.getFloor() != null ? room.getFloor().getId() : null)
                        .floorName(room.getFloor() != null ? room.getFloor().getName() : null)
                        .departmentId(room.getDepartment() != null ? room.getDepartment().getId() : null)
                        .departmentName(room.getDepartment() != null ? room.getDepartment().getName() : null)
                        .build())
                .collect(Collectors.toList());

        long distinctDepartments = roomResponses.stream()
                .map(StaffAssignedRoomResponse::getDepartmentId)
                .filter(departmentId -> departmentId != null)
                .collect(Collectors.toCollection(LinkedHashSet::new))
                .size();

        String summary = "Assigned to " + roomResponses.size() + " room(s)";
        if (distinctDepartments > 0) {
            summary += " across " + distinctDepartments + " department(s)";
        }
        summary += ".";

        return StaffDetailResponse.builder()
                .staff(StaffMapper.toResponse(staff))
                .assignedRooms(roomResponses)
                .assignedRoomCount(roomResponses.size())
                .activitySummary(summary)
                .build();
    }

    @Override
    public List<Room> assignRooms(UUID id, Hospital hospital, List<UUID> roomIds) {
        Staff staff = getByIdAndHospital(id, hospital);

        List<UUID> uniqueRoomIds = roomIds == null
                ? List.of()
                : new ArrayList<>(new LinkedHashSet<>(roomIds));

        List<Room> existingAssignedRooms = roomRepository.findByAssignedStaff(staff);
        if (!existingAssignedRooms.isEmpty()) {
            existingAssignedRooms.forEach(room -> room.getAssignedStaff().remove(staff));
            roomRepository.saveAll(existingAssignedRooms);
        }

        if (uniqueRoomIds.isEmpty()) {
            return List.of();
        }

        List<Room> targetRooms = roomRepository.findAllById(uniqueRoomIds);
        if (targetRooms.size() != uniqueRoomIds.size()) {
            throw new BadRequestException("One or more rooms were not found.");
        }

        for (Room room : targetRooms) {
            if (room.getHospital() == null || !room.getHospital().getId().equals(hospital.getId())) {
                throw new BadRequestException("One or more rooms do not belong to your hospital.");
            }
        }

        targetRooms.forEach(room -> {
            if (!room.getAssignedStaff().contains(staff)) {
                room.getAssignedStaff().add(staff);
            }
            // System-generated task for room assignment
            taskService.createSystemTask(
                "Initial Room Assessment - Room #" + room.getRoomNumber(),
                "Perform initial patient and room safety check for the newly assigned room.",
                staff,
                room.getId(),
                null
            );
        });
        return roomRepository.saveAll(targetRooms);
    }

    @Override
    public List<Room> getRoomsForCurrentStaff(UUID userId) {
        log.info("Assigned Rooms Trace: Looking for staff with userId={}", userId);
        Optional<Staff> staffOpt = repository.findByUserId(userId);
        
        if (staffOpt.isEmpty()) {
            log.warn("Assigned Rooms Trace: No staff record found for userId={}", userId);
            return List.of();
        }

        Staff staff = staffOpt.get();
        List<Room> rooms = roomRepository.findByAssignedStaff(staff);
        log.info("Assigned Rooms Trace: Found staffId={}, returning {} room(s)", staff.getId(), rooms.size());
        
        return rooms;
    }

    /**
     * Private helper method to delete staff with cleanup of room assignments and
     * user account.
     * Performs room reassignment within transaction, then attempts user-service
     * deletion asynchronously.
     */
    private UUID deleteStaffWithCleanup(Staff staff) {
        UUID staffId = staff.getId();
        UUID userId = staff.getUserId();

        log.info("Starting deletion of staff: {} (userId: {})", staffId, userId);

        List<Room> assignedRooms = roomRepository.findByAssignedStaff(staff);
        if (!assignedRooms.isEmpty()) {
            log.info("Removing staff {} from {} room(s)", staffId, assignedRooms.size());
            assignedRooms.forEach(room -> room.getAssignedStaff().remove(staff));
            roomRepository.saveAll(assignedRooms);
        }

        repository.delete(staff);
        log.info("Successfully deleted staff: {} and cleaned up room assignments", staffId);
        return userId;
    }

    @Override
    public void assignStaffToRoom(UUID staffId, UUID roomId) {
        Staff staff = repository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff not found"));
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));

        // Enforce role-based limits
        long currentCount = roomRepository.countStaffByRoomIdAndRole(roomId, staff.getRole());
        if (staff.getRole() == com.medflow.hospitalservice.entity.enums.StaffRole.NURSE && currentCount >= 5) {
            throw new BadRequestException("Room has reached max capacity for Nurses (5)");
        }
        if (staff.getRole() == com.medflow.hospitalservice.entity.enums.StaffRole.DOCTOR && currentCount >= 2) {
            throw new BadRequestException("Room has reached max capacity for Doctors (2)");
        }

        if (!room.getAssignedStaff().contains(staff)) {
            room.getAssignedStaff().add(staff);
            roomRepository.save(room);
            
            taskService.createSystemTask(
                "Initial Room Assessment - Room #" + room.getRoomNumber(),
                "Perform initial patient and room safety check for the newly assigned room.",
                staff,
                room.getId(),
                null
            );
        }
    }

    @Override
    public List<Room> getRoomsNeedingStaff(com.medflow.hospitalservice.entity.enums.StaffRole role, Hospital hospital) {
        List<Room> allRooms = roomRepository.findByHospital(hospital);
        return allRooms.stream()
                .filter(room -> {
                    long count = roomRepository.countStaffByRoomIdAndRole(room.getId(), role);
                    return (role == com.medflow.hospitalservice.entity.enums.StaffRole.NURSE && count < 5) ||
                           (role == com.medflow.hospitalservice.entity.enums.StaffRole.DOCTOR && count < 2);
                })
                .sorted((r1, r2) -> {
                    long c1 = roomRepository.countStaffByRoomIdAndRole(r1.getId(), role);
                    long c2 = roomRepository.countStaffByRoomIdAndRole(r2.getId(), role);
                    return Long.compare(c1, c2); // Sort by lowest count first
                })
                .collect(Collectors.toList());
    }

    @Override
    public void autoAssignStaff(Staff staff) {
        List<Room> availableRooms = getRoomsNeedingStaff(staff.getRole(), staff.getHospital());
        if (!availableRooms.isEmpty()) {
            Room bestRoom = availableRooms.get(0);
            assignStaffToRoom(staff.getId(), bestRoom.getId());
            log.info("Auto-assigned staff {} to room {}", staff.getId(), bestRoom.getRoomNumber());
        } else {
            log.warn("No available rooms found for auto-assigning staff {}", staff.getId());
        }
    }

    /**
     * Attempt to delete user account from user-service.
     * Errors are logged but do NOT rollback staff deletion (asymmetric tolerance).
     */
    private void deleteUserAfterStaffCommit(UUID userId, String authorizationHeader) {
        if (userId == null) {
            log.warn("UserId is null, skipping user-service deletion");
            return;
        }

        try {
            log.info("Deleting user {} from user-service", userId);
            userProvisioningClient.deleteUser(authorizationHeader, userId);
            log.info("User {} deleted successfully", userId);
        } catch (RestClientException e) {
            log.error("Failed to delete user {}", userId, e);
        } catch (Exception e) {
            log.error("Failed to delete user {}", userId, e);
        }
    }
}