package com.medflow.hospitalservice.service.impl;

import com.medflow.hospitalservice.dto.DepartmentDeleteActionRequest;
import com.medflow.hospitalservice.dto.DepartmentResponse;
import com.medflow.hospitalservice.entity.Department;
import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.entity.Room;
import com.medflow.hospitalservice.entity.Staff;
import com.medflow.hospitalservice.entity.enums.BedStatus;
import com.medflow.hospitalservice.entity.enums.DepartmentStatus;
import com.medflow.hospitalservice.exception.BadRequestException;
import com.medflow.hospitalservice.exception.ResourceNotFoundException;
import com.medflow.hospitalservice.mapper.DepartmentMapper;
import com.medflow.hospitalservice.repository.BedRepository;
import com.medflow.hospitalservice.repository.DepartmentRepository;
import com.medflow.hospitalservice.repository.RoomRepository;
import com.medflow.hospitalservice.repository.StaffRepository;
import com.medflow.hospitalservice.security.JwtClaimsExtractor;
import com.medflow.hospitalservice.service.DepartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DepartmentServiceImpl implements DepartmentService {

    private final DepartmentRepository repository;
    private final RoomRepository roomRepository;
    private final BedRepository bedRepository;
    private final StaffRepository staffRepository;
    private final JwtClaimsExtractor jwtClaimsExtractor;

    private static final String DEFAULT_COLOR = "#0092DF";

    @Override
    public Department create(Department department) {
        if (department.getStatus() == null) {
            department.setStatus(DepartmentStatus.ACTIVE);
        }
        if (department.getColor() == null || department.getColor().isBlank()) {
            department.setColor(DEFAULT_COLOR);
        }
        return repository.save(department);
    }

    @Override
    public List<Department> getAll() {
        return repository.findAll();
    }

    @Override
    public List<Department> getByHospital(Hospital hospital) {
        return repository.findByHospital(hospital);
    }

    @Override
    public Department getById(UUID id) {
        UUID hospitalId = jwtClaimsExtractor.getHospitalId();
        if (hospitalId == null) {
            throw new SecurityException("HospitalId not found in token. Access denied.");
        }

        return repository.findByIdAndHospitalId(id, hospitalId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + id));
    }

    @Override
    public Department getByIdAndHospital(UUID id, Hospital hospital) {
        return repository.findByIdAndHospital(id, hospital)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + id));
    }

    @Override
    public Department update(UUID id, Department department) {
        Department existing = getById(id);
        existing.setName(department.getName());
        existing.setDescription(department.getDescription());
        existing.setColor(
                department.getColor() == null || department.getColor().isBlank()
                        ? DEFAULT_COLOR
                        : department.getColor());
        existing.setStatus(department.getStatus() != null ? department.getStatus() : existing.getStatus());
        existing.setHospital(department.getHospital());
        return repository.save(existing);
    }

    @Override
    public Department update(UUID id, Department department, Hospital hospital) {
        Department existing = getByIdAndHospital(id, hospital);
        existing.setName(department.getName());
        existing.setDescription(department.getDescription());
        existing.setColor(
                department.getColor() == null || department.getColor().isBlank()
                        ? DEFAULT_COLOR
                        : department.getColor());
        existing.setStatus(department.getStatus() != null ? department.getStatus() : existing.getStatus());
        return repository.save(existing);
    }

    @Override
    public void delete(UUID id) {
        UUID hospitalId = jwtClaimsExtractor.getHospitalId();
        if (hospitalId == null) {
            throw new SecurityException("HospitalId not found in token. Access denied.");
        }

        Department department = repository.findByIdAndHospitalId(id, hospitalId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + id));

        validateDepartmentCanBeDeleted(department);
        repository.delete(department);
    }

    @Override
    public void delete(UUID id, Hospital hospital) {
        Department existing = getByIdAndHospital(id, hospital);
        validateDepartmentCanBeDeleted(existing);
        repository.delete(existing);
    }

    @Override
    @Transactional
    public void deleteWithAction(UUID id, Hospital hospital, DepartmentDeleteActionRequest request) {
        Department sourceDepartment = getByIdAndHospital(id, hospital);

        if (request == null || request.action() == null) {
            throw new BadRequestException("Delete action is required.");
        }

        if (request.action() == DepartmentDeleteActionRequest.DeleteAction.DELETE_CASCADE) {
            deleteCascade(sourceDepartment);
            return;
        }

        if (request.action() == DepartmentDeleteActionRequest.DeleteAction.REASSIGN_AND_DELETE) {
            reassignAndDelete(sourceDepartment, hospital, request.targetDepartmentId());
            return;
        }

        throw new BadRequestException("Unsupported delete action.");
    }

    private void validateDepartmentCanBeDeleted(Department department) {
        long staffCount = staffRepository.findByDepartment(department).size();
        if (staffCount > 0) {
            throw new BadRequestException(
                    "Cannot delete department while staff members are assigned to it. Reassign staff first.");
        }

        long roomCount = roomRepository.findByDepartment(department).size();
        if (roomCount > 0) {
            throw new BadRequestException(
                    "Cannot delete department while rooms are assigned to it. Reassign or delete rooms first.");
        }
    }

    private void deleteCascade(Department sourceDepartment) {
        List<Staff> staffInDepartment = staffRepository.findByDepartment(sourceDepartment);
        if (!staffInDepartment.isEmpty()) {
            staffInDepartment.forEach(staff -> staff.setDepartment(null));
            staffRepository.saveAll(staffInDepartment);
        }

        List<Room> roomsInDepartment = roomRepository.findByDepartment(sourceDepartment);
        if (!roomsInDepartment.isEmpty()) {
            roomRepository.deleteAll(roomsInDepartment);
        }

        repository.delete(sourceDepartment);
    }

    private void reassignAndDelete(Department sourceDepartment, Hospital hospital, UUID targetDepartmentId) {
        if (targetDepartmentId == null) {
            throw new BadRequestException("Target department is required for reassignment.");
        }

        if (sourceDepartment.getId().equals(targetDepartmentId)) {
            throw new BadRequestException("Target department must be different from the department being deleted.");
        }

        Department targetDepartment = getByIdAndHospital(targetDepartmentId, hospital);

        List<Staff> staffInDepartment = staffRepository.findByDepartment(sourceDepartment);
        if (!staffInDepartment.isEmpty()) {
            staffInDepartment.forEach(staff -> staff.setDepartment(targetDepartment));
            staffRepository.saveAll(staffInDepartment);
        }

        List<Room> roomsInDepartment = roomRepository.findByDepartment(sourceDepartment);
        if (!roomsInDepartment.isEmpty()) {
            roomsInDepartment.forEach(room -> room.setDepartment(targetDepartment));
            roomRepository.saveAll(roomsInDepartment);

            // Keep both sides in sync before deleting source department to avoid stale
            // orphan/cascade deletion.
            sourceDepartment.getRooms().clear();
            targetDepartment.getRooms().addAll(roomsInDepartment);
        }

        repository.delete(sourceDepartment);
    }

    @Override
    public DepartmentResponse toResponseWithStats(Department department) {
        List<Room> rooms = roomRepository.findByDepartment(department);
        int roomCount = rooms.size();

        if (rooms.isEmpty()) {
            return DepartmentMapper.toResponseWithStats(department, roomCount, 0, 0, 0.0);
        }

        int bedCount = (int) bedRepository.countByRoomIn(rooms);
        int occupiedBedCount = (int) bedRepository.countByRoomInAndStatus(rooms, BedStatus.OCCUPIED);
        double occupancyRate = bedCount == 0 ? 0.0 : (occupiedBedCount * 100.0) / bedCount;

        return DepartmentMapper.toResponseWithStats(department, roomCount, bedCount, occupiedBedCount, occupancyRate);
    }

    @Override
    public List<DepartmentResponse> getByHospitalWithStats(Hospital hospital) {
        return getByHospital(hospital).stream()
                .map(this::toResponseWithStats)
                .toList();
    }
}