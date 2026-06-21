package com.medflow.hospitalservice.service;

import com.medflow.hospitalservice.dto.StaffDetailResponse;
import com.medflow.hospitalservice.entity.Department;
import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.entity.Staff;
import com.medflow.hospitalservice.entity.Room;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StaffService {
    Staff create(Staff staff);

    List<Staff> getAll();

    List<Staff> getByHospital(Hospital hospital);

    List<Staff> getByDepartment(Department department);

    Staff getById(UUID id);

    Optional<Staff> getByUserId(UUID userId);

    Staff getByIdAndHospital(UUID id, Hospital hospital);

    Staff update(UUID id, Staff staff);

    Staff update(UUID id, Staff staff, Hospital hospital);

    void delete(UUID id);

    void delete(UUID id, Hospital hospital);

    void delete(UUID id, Hospital hospital, String authorizationHeader);

    StaffDetailResponse getDetail(UUID id, Hospital hospital);

    List<Room> assignRooms(UUID id, Hospital hospital, List<UUID> roomIds);

    List<Room> getRoomsForCurrentStaff(UUID userId);

    void assignStaffToRoom(UUID staffId, UUID roomId);

    List<Room> getRoomsNeedingStaff(com.medflow.hospitalservice.entity.enums.StaffRole role, Hospital hospital);

    void autoAssignStaff(Staff staff);
}