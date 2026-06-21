package com.medflow.hospitalservice.service;

import com.medflow.hospitalservice.entity.Department;
import com.medflow.hospitalservice.entity.Floor;
import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.entity.Room;

import java.util.List;
import java.util.UUID;

public interface RoomService {
    Room create(Room room);
    List<Room> getAll();
    List<Room> getByHospital(Hospital hospital);
    List<Room> getByDepartment(Department department);
    List<Room> getByFloor(Floor floor);
    Room getById(UUID id);
    Room update(UUID id, Room room);
    void delete(UUID id);
}