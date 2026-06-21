package com.medflow.hospitalservice.service.impl;

import com.medflow.hospitalservice.entity.Floor;
import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.exception.ResourceNotFoundException;
import com.medflow.hospitalservice.repository.FloorRepository;
import com.medflow.hospitalservice.security.JwtClaimsExtractor;
import com.medflow.hospitalservice.service.FloorService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FloorServiceImpl implements FloorService {

    private final FloorRepository repository;
    private final JwtClaimsExtractor jwtClaimsExtractor;

    @Override
    public Floor create(Floor floor) {
        return repository.save(floor);
    }

    @Override
    public List<Floor> getAll() {
        return repository.findAll();
    }

    @Override
    public List<Floor> getByHospital(Hospital hospital) {
        return repository.findByHospital(hospital);
    }

    @Override
    public Floor getById(UUID id) {
        UUID hospitalId = jwtClaimsExtractor.getHospitalId();
        if (hospitalId == null) {
            throw new SecurityException("HospitalId not found in token. Access denied.");
        }

        return repository.findByIdAndHospitalId(id, hospitalId)
                .orElseThrow(() -> new ResourceNotFoundException("Floor not found with id: " + id));
    }

    @Override
    public Floor getByIdAndHospital(UUID id, Hospital hospital) {
        if (hospital == null || hospital.getId() == null) {
            throw new ResourceNotFoundException("Hospital context is required.");
        }

        return repository.findByIdAndHospitalId(id, hospital.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Floor not found with id: " + id));
    }

    @Override
    public Floor update(UUID id, Floor floor) {
        Floor existing = getById(id);
        existing.setFloorNumber(floor.getFloorNumber());
        existing.setName(floor.getName());
        existing.setHospital(floor.getHospital());
        return repository.save(existing);
    }

    @Override
    public void delete(UUID id) {
        UUID hospitalId = jwtClaimsExtractor.getHospitalId();
        if (hospitalId == null) {
            throw new SecurityException("HospitalId not found in token. Access denied.");
        }

        Floor floor = repository.findByIdAndHospitalId(id, hospitalId)
                .orElseThrow(() -> new ResourceNotFoundException("Floor not found with id: " + id));

        repository.delete(floor);
    }
}