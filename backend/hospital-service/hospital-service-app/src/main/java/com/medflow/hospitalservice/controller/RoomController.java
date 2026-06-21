package com.medflow.hospitalservice.controller;

import com.medflow.hospitalservice.dto.RoomRequest;
import com.medflow.hospitalservice.dto.RoomResponse;
import com.medflow.hospitalservice.entity.Department;
import com.medflow.hospitalservice.entity.Floor;
import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.mapper.RoomMapper;
import com.medflow.hospitalservice.security.JwtClaimsExtractor;
import com.medflow.hospitalservice.service.DepartmentService;
import com.medflow.hospitalservice.service.FloorService;
import com.medflow.hospitalservice.service.HospitalService;
import com.medflow.hospitalservice.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final HospitalService hospitalService;
    private final DepartmentService departmentService;
    private final FloorService floorService;
    private final JwtClaimsExtractor jwtClaimsExtractor;

    private Hospital getAuthenticatedHospital() {
        UUID hospitalId = jwtClaimsExtractor.getRequiredHospitalId();
        return hospitalService.getById(hospitalId);
    }

    @PostMapping
    public ResponseEntity<RoomResponse> create(@Valid @RequestBody RoomRequest request) {
        Hospital hospital = getAuthenticatedHospital();
        Department department = departmentService.getByIdAndHospital(request.getDepartmentId(), hospital);
        Floor floor = floorService.getByIdAndHospital(request.getFloorId(), hospital);

        RoomResponse response = RoomMapper.toResponse(
                roomService.create(RoomMapper.toEntity(request, hospital, department, floor)));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<RoomResponse>> getAll() {
        Hospital hospital = getAuthenticatedHospital();
        List<RoomResponse> response = roomService.getByHospital(hospital).stream()
                .map(RoomMapper::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/floor/{floorId}")
    public ResponseEntity<List<RoomResponse>> getByFloor(@PathVariable UUID floorId) {
        Hospital hospital = getAuthenticatedHospital();
        Floor floor = floorService.getByIdAndHospital(floorId, hospital);
        List<RoomResponse> response = roomService.getByFloor(floor).stream()
                .map(RoomMapper::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<List<RoomResponse>> getMyRooms() {
        Hospital hospital = getAuthenticatedHospital();
        List<RoomResponse> response = roomService.getByHospital(hospital).stream()
                .map(RoomMapper::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoomResponse> update(@PathVariable UUID id, @Valid @RequestBody RoomRequest request) {
        Hospital hospital = getAuthenticatedHospital();
        Department department = departmentService.getByIdAndHospital(request.getDepartmentId(), hospital);
        Floor floor = floorService.getByIdAndHospital(request.getFloorId(), hospital);

        RoomResponse response = RoomMapper.toResponse(
                roomService.update(id, RoomMapper.toEntity(request, hospital, department, floor)));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        roomService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
