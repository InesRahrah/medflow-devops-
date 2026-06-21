package com.medflow.hospitalservice.service.impl;

import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.entity.enums.HospitalStatus;
import com.medflow.hospitalservice.exception.ResourceNotFoundException;
import com.medflow.hospitalservice.repository.HospitalRepository;
import com.medflow.hospitalservice.service.HospitalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class HospitalServiceImpl implements HospitalService {

    private final HospitalRepository hospitalRepository;
    private static final String DEFAULT_HOSPITAL_NAME = "Hospital";

    @Override
    public Hospital create(UUID userId) {
        return create(userId, null);
    }

    @Override
    public Hospital create(UUID userId, String name) {
        String resolvedName = resolveHospitalName(name);
        return hospitalRepository.findByUserId(userId)
                .orElseGet(() -> hospitalRepository.save(
                        Hospital.builder()
                                .userId(userId)
                                .name(resolvedName)
                                .status(HospitalStatus.ACTIVE)
                                .build()));
    }

    @Override
    public List<Hospital> getAll() {
        return hospitalRepository.findAll();
    }

    @Override
    public Hospital getById(UUID id) {
        return hospitalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found with id: " + id));
    }

    @Override
    public Hospital update(UUID id, Hospital hospital) {
        Hospital existing = getById(id);

        existing.setName(hospital.getName());
        existing.setStatus(hospital.getStatus());

        return hospitalRepository.save(existing);
    }

    @Override
    public void delete(UUID id) {
        hospitalRepository.deleteById(id);
    }

    @Override
    public Hospital findByUserId(UUID userId) {
        return hospitalRepository.findByUserId(userId)
                .orElseGet(() -> {
                    log.info("No hospital found for userId={}, creating one automatically", userId);
                    return create(userId);
                });
    }

    private String resolveHospitalName(String name) {
        if (name == null || name.isBlank()) {
            return DEFAULT_HOSPITAL_NAME;
        }
        return name.trim();
    }
}