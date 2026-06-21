package com.medflow.stockservice.controller;

import com.medflow.stockservice.dto.AssignDeliveryRequestDTO;
import com.medflow.stockservice.entity.StockRequest;
import com.medflow.stockservice.entity.enums.Region;
import com.medflow.stockservice.service.StockRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/requests")
@RequiredArgsConstructor
public class StockRequestController {

    private final StockRequestService service;

    // ✅ CREATE
    @PostMapping
    public StockRequest create(
            @RequestBody StockRequest request,
            @RequestHeader("userId") UUID userId
    ) {
        return service.create(request, userId);
    }

    // ✅ PHARMACIST → MES REQUESTS
    @GetMapping("/my")
    public List<StockRequest> getMyRequests(
            @RequestHeader("userId") UUID userId
    ) {
        return service.getMyRequests(userId);
    }

    // ✅ CENTRAL → TOUT VOIR
    @GetMapping("/central")
    public List<StockRequest> getAllForCentral() {
        return service.getAll();
    }

    // ✅ GET ONE
    @GetMapping("/{id}")
    public StockRequest getById(@PathVariable Long id) {
        return service.getById(id);
    }

    // ✅ UPDATE
    @PutMapping("/{id}")
    public StockRequest update(@PathVariable Long id, @RequestBody StockRequest request) {
        return service.update(id, request);
    }

    // ✅ DELETE
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    // ✅ OPTIONNEL (peut rester)
    @GetMapping("/region/{region}")
    public List<StockRequest> getByRegion(@PathVariable Region region) {
        return service.getByRegion(region);
    }

    // ✅ APPROVE SANS deliveryAgentId
    @PutMapping("/{id}/approve")
    public StockRequest approve(@PathVariable Long id) {
        return service.approveRequest(id);
    }
    // ✅ REJECT
    @PutMapping("/{id}/reject")
    public StockRequest reject(@PathVariable Long id) {
        return service.rejectRequest(id);
    }

    @PutMapping("/{id}/assign-delivery")
    public ResponseEntity<StockRequest> assignDelivery(
            @PathVariable Long id,
            @RequestBody AssignDeliveryRequestDTO dto
    ) {
        return ResponseEntity.ok(
                service.assignDeliveryAgent(
                        id,
                        dto.getDeliveryAgentId(),
                        dto.getDeliveryAgentName(),
                        dto.getVehicleType()
                )
        );
    }
}
