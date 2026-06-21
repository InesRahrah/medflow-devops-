package com.medflow.hospitalservice.controller;

import com.medflow.hospitalservice.dto.BedRequest;
import com.medflow.hospitalservice.dto.BedResponse;
import com.medflow.hospitalservice.entity.Room;
import com.medflow.hospitalservice.mapper.BedMapper;
import com.medflow.hospitalservice.security.AdminAuthorization;
import com.medflow.hospitalservice.service.BedService;
import com.medflow.hospitalservice.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/beds")
@RequiredArgsConstructor
public class BedController {

    private final BedService bedService;
    private final RoomService roomService;

    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    @PostMapping
    public ResponseEntity<BedResponse> create(@Valid @RequestBody BedRequest request) {
        Room room = roomService.getById(request.getRoomId());
        BedResponse response = BedMapper.toResponse(
                bedService.create(BedMapper.toEntity(request, room)));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PreAuthorize("hasAnyRole('STAFF_ADMIN','HOSPITAL','DOCTOR','NURSE')")
    @GetMapping
    public ResponseEntity<List<BedResponse>> getAll() {
        List<BedResponse> response = bedService.getAll().stream()
                .map(BedMapper::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('STAFF_ADMIN','HOSPITAL','DOCTOR','NURSE')")
    @GetMapping("/{id}")
    public ResponseEntity<BedResponse> getById(@PathVariable UUID id) {
        BedResponse response = BedMapper.toResponse(bedService.getById(id));
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('STAFF_ADMIN','HOSPITAL','DOCTOR','NURSE')")
    @GetMapping("/room/{roomId}")
    public ResponseEntity<List<BedResponse>> getByRoom(@PathVariable UUID roomId) {
        Room room = roomService.getById(roomId);
        List<BedResponse> response = bedService.getByRoom(room).stream()
                .map(BedMapper::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    @PutMapping("/{id}")
    public ResponseEntity<BedResponse> update(@PathVariable UUID id, @Valid @RequestBody BedRequest request) {
        Room room = roomService.getById(request.getRoomId());
        BedResponse response = BedMapper.toResponse(
                bedService.update(id, BedMapper.toEntity(request, room)));
        return ResponseEntity.ok(response);
    }

    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        bedService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
