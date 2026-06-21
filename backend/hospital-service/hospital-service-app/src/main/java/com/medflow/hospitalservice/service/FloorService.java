package com.medflow.hospitalservice.service;

import com.medflow.hospitalservice.entity.Floor;
import com.medflow.hospitalservice.entity.Hospital;

import java.util.List;
import java.util.UUID;

public interface FloorService {
    Floor create(Floor floor);

    List<Floor> getAll();

    List<Floor> getByHospital(Hospital hospital);

    Floor getById(UUID id);

    Floor getByIdAndHospital(UUID id, Hospital hospital);

    Floor update(UUID id, Floor floor);

    void delete(UUID id);
}