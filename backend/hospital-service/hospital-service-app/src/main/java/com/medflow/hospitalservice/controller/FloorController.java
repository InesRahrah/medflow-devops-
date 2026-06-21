package com.medflow.hospitalservice.controller;

import com.medflow.hospitalservice.dto.FloorRequest;
import com.medflow.hospitalservice.dto.FloorResponse;
import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.mapper.FloorMapper;
import com.medflow.hospitalservice.security.JwtClaimsExtractor;
import com.medflow.hospitalservice.service.FloorService;
import com.medflow.hospitalservice.service.HospitalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/floors")
@RequiredArgsConstructor
public class FloorController {

    private final FloorService floorService;
    private final HospitalService hospitalService;
    private final JwtClaimsExtractor jwtClaimsExtractor;

    private Hospital getAuthenticatedHospital() {
        UUID hospitalId = jwtClaimsExtractor.getRequiredHospitalId();
        return hospitalService.getById(hospitalId);
    }

    @PostMapping
    public ResponseEntity<FloorResponse> create(@Valid @RequestBody FloorRequest request) {
        Hospital hospital = getAuthenticatedHospital();
        FloorResponse response = FloorMapper.toResponse(
                floorService.create(FloorMapper.toEntity(request, hospital)));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<FloorResponse>> getAll() {
        Hospital hospital = getAuthenticatedHospital();
        List<FloorResponse> response = floorService.getByHospital(hospital).stream()
                .map(FloorMapper::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FloorResponse> getById(@PathVariable UUID id) {
        FloorResponse response = FloorMapper.toResponse(floorService.getById(id));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<List<FloorResponse>> getMyFloors() {
        Hospital hospital = getAuthenticatedHospital();
        List<FloorResponse> response = floorService.getByHospital(hospital).stream()
                .map(FloorMapper::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FloorResponse> update(@PathVariable UUID id, @Valid @RequestBody FloorRequest request) {
        Hospital hospital = getAuthenticatedHospital();
        FloorResponse response = FloorMapper.toResponse(
                floorService.update(id, FloorMapper.toEntity(request, hospital)));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        floorService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
