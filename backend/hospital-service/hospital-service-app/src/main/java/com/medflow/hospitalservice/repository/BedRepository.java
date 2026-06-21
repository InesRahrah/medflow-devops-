package com.medflow.hospitalservice.repository;

import com.medflow.hospitalservice.entity.Bed;
import com.medflow.hospitalservice.entity.Room;
import com.medflow.hospitalservice.entity.enums.BedStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BedRepository extends JpaRepository<Bed, UUID> {
    List<Bed> findByRoom(Room room);

    List<Bed> findByRoom_HospitalId(UUID hospitalId);

    List<Bed> findByRoomIdAndRoom_HospitalId(UUID roomId, UUID hospitalId);

    Optional<Bed> findByIdAndRoom_HospitalId(UUID id, UUID hospitalId);

    long deleteByIdAndRoom_HospitalId(UUID id, UUID hospitalId);

    long countByRoom(Room room);

    long countByRoom_HospitalId(UUID hospitalId);

    long countByRoomAndIdNot(Room room, UUID id);

    long countByRoomIn(List<Room> rooms);

    long countByRoomInAndStatus(List<Room> rooms, BedStatus status);
}
