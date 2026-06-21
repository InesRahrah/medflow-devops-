package com.medflow.hospitalservice.repository;

import com.medflow.hospitalservice.entity.Department;
import com.medflow.hospitalservice.entity.Floor;
import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.entity.Room;
import com.medflow.hospitalservice.entity.Staff;
import com.medflow.hospitalservice.entity.enums.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {
    List<Room> findByHospital(Hospital hospital);

    List<Room> findByDepartment(Department department);

    List<Room> findByFloor(Floor floor);

    List<Room> findByAssignedStaff(Staff staff);

    long countByAssignedStaffAndStatusIn(Staff staff, List<RoomStatus> statuses);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(s) FROM Room r JOIN r.assignedStaff s WHERE r.id = :roomId AND s.role = :role")
    long countStaffByRoomIdAndRole(UUID roomId, com.medflow.hospitalservice.entity.enums.StaffRole role);

    // Hospital isolation methods
    List<Room> findByHospitalId(UUID hospitalId);

    Optional<Room> findByIdAndHospitalId(UUID id, UUID hospitalId);

    List<Room> findByFloorIdAndHospitalId(UUID floorId, UUID hospitalId);

    List<Room> findByDepartmentIdAndHospitalId(UUID departmentId, UUID hospitalId);

    long countByHospitalId(UUID hospitalId);
}
