package com.medflow.hospitalservice.controller;

import com.medflow.hospitalservice.dto.DepartmentDeleteActionRequest;
import com.medflow.hospitalservice.dto.DepartmentRequest;
import com.medflow.hospitalservice.dto.DepartmentResponse;
import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.mapper.DepartmentMapper;
import com.medflow.hospitalservice.security.JwtClaimsExtractor;
import com.medflow.hospitalservice.service.DepartmentService;
import com.medflow.hospitalservice.service.HospitalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;
    private final HospitalService hospitalService;
    private final JwtClaimsExtractor jwtClaimsExtractor;

    private Hospital getAuthenticatedHospital() {
        UUID hospitalId = jwtClaimsExtractor.getRequiredHospitalId();
        return hospitalService.getById(hospitalId);
    }

    @PostMapping
    public ResponseEntity<DepartmentResponse> create(@Valid @RequestBody DepartmentRequest request) {
        Hospital hospital = getAuthenticatedHospital();
        DepartmentResponse response = departmentService.toResponseWithStats(
                departmentService.create(DepartmentMapper.toEntity(request, hospital)));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<DepartmentResponse>> getAll() {
        Hospital hospital = getAuthenticatedHospital();
        List<DepartmentResponse> response = departmentService.getByHospitalWithStats(hospital);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DepartmentResponse> getById(@PathVariable UUID id) {
        Hospital hospital = getAuthenticatedHospital();
        DepartmentResponse response = departmentService.toResponseWithStats(
                departmentService.getByIdAndHospital(id, hospital));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<List<DepartmentResponse>> getMyDepartments() {
        Hospital hospital = getAuthenticatedHospital();
        List<DepartmentResponse> response = departmentService.getByHospitalWithStats(hospital);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DepartmentResponse> update(@PathVariable UUID id,
            @Valid @RequestBody DepartmentRequest request) {
        Hospital hospital = getAuthenticatedHospital();
        DepartmentResponse response = departmentService.toResponseWithStats(
                departmentService.update(id, DepartmentMapper.toEntity(request, hospital), hospital));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        Hospital hospital = getAuthenticatedHospital();
        departmentService.delete(id, hospital);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/delete-action")
    public ResponseEntity<Void> deleteWithAction(
            @PathVariable UUID id,
            @Valid @RequestBody DepartmentDeleteActionRequest request) {
        Hospital hospital = getAuthenticatedHospital();
        departmentService.deleteWithAction(id, hospital, request);
        return ResponseEntity.noContent().build();
    }
}
