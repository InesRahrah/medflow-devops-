package com.medflow.hospitalservice.service;

import com.medflow.hospitalservice.entity.Hospital;

import java.util.List;
import java.util.UUID;

public interface HospitalService {

    Hospital create(UUID userId);

    Hospital create(UUID userId, String name);

    List<Hospital> getAll();

    Hospital getById(UUID id);

    Hospital update(UUID id, Hospital hospital);

    void delete(UUID id);

    Hospital findByUserId(UUID userId);
}