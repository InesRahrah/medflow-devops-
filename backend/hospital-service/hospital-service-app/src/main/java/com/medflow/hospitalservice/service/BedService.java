package com.medflow.hospitalservice.service;

import com.medflow.hospitalservice.entity.Bed;
import com.medflow.hospitalservice.entity.Room;

import java.util.List;
import java.util.UUID;

public interface BedService {
    Bed create(Bed bed);
    List<Bed> getAll();
    List<Bed> getByRoom(Room room);
    Bed getById(UUID id);
    Bed update(UUID id, Bed bed);
    void delete(UUID id);
}