package com.medflow.hospitalservice.controller;

import com.medflow.hospitalservice.dto.HospitalRequest;
import com.medflow.hospitalservice.dto.HospitalProvisionRequest;
import com.medflow.hospitalservice.dto.HospitalResponse;
import com.medflow.hospitalservice.mapper.HospitalMapper;
import com.medflow.hospitalservice.security.AdminAuthorization;
import com.medflow.hospitalservice.security.JwtClaimsExtractor;
import com.medflow.hospitalservice.service.HospitalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/hospitals")
@RequiredArgsConstructor
@Slf4j
public class HospitalController {

    private final HospitalService hospitalService;
    private final JwtClaimsExtractor jwtClaimsExtractor;

    private UUID getAuthenticatedUserId() {
        String userIdStr = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return UUID.fromString(userIdStr);
    }

    private com.medflow.hospitalservice.entity.Hospital getAuthenticatedHospital() {
        UUID hospitalId = jwtClaimsExtractor.getRequiredHospitalId();
        return hospitalService.getById(hospitalId);
    }

    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    @PostMapping("/me")
    public ResponseEntity<HospitalResponse> createMe(@RequestBody(required = false) HospitalProvisionRequest request) {
        UUID authenticatedUserId = getAuthenticatedUserId();

        if (request != null && request.getUserId() != null && !authenticatedUserId.equals(request.getUserId())) {
            log.warn(
                    "Provisioning request userId {} does not match authenticated userId {}. Using authenticated userId.",
                    request.getUserId(), authenticatedUserId);
        }

        String requestedName = request != null ? request.getName() : null;
        HospitalResponse response = HospitalMapper
                .toResponse(hospitalService.create(authenticatedUserId, requestedName));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    @GetMapping
    public ResponseEntity<List<HospitalResponse>> getAll() {
        HospitalResponse response = HospitalMapper.toResponse(getAuthenticatedHospital());
        return ResponseEntity.ok(List.of(response));
    }

    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    @GetMapping("/{id}")
    public ResponseEntity<HospitalResponse> getById(@PathVariable UUID id) {
        HospitalResponse ownHospital = HospitalMapper.toResponse(getAuthenticatedHospital());
        if (!ownHospital.getId().equals(id)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ownHospital);
    }

    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    @PutMapping("/{id}")
    public ResponseEntity<HospitalResponse> update(@PathVariable UUID id, @Valid @RequestBody HospitalRequest request) {
        UUID userId = getAuthenticatedUserId();
        HospitalResponse ownHospital = HospitalMapper.toResponse(getAuthenticatedHospital());
        if (!ownHospital.getId().equals(id)) {
            return ResponseEntity.notFound().build();
        }
        HospitalResponse response = HospitalMapper.toResponse(
                hospitalService.update(id, HospitalMapper.toEntity(request, userId)));
        return ResponseEntity.ok(response);
    }

    @PreAuthorize(AdminAuthorization.ADMIN_ROLES)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        HospitalResponse ownHospital = HospitalMapper.toResponse(getAuthenticatedHospital());
        if (!ownHospital.getId().equals(id)) {
            return ResponseEntity.notFound().build();
        }
        hospitalService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // TODO(security): This internal endpoint is intentionally kept
    // behavior-compatible for now.
    // Restrict with service-to-service authentication in a dedicated hardening
    // pass.
    @GetMapping("/internal/by-user/{userId}")
    public ResponseEntity<UUID> getHospitalIdByUserId(@PathVariable UUID userId) {
        var hospital = hospitalService.findByUserId(userId);
        return ResponseEntity.ok(hospital.getId());
    }
}
