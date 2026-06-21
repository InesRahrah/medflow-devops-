package com.medflow.stockservice.service;

import com.medflow.stockservice.entity.PharmacyStock;
import com.medflow.stockservice.entity.StockRequest;
import com.medflow.stockservice.entity.enums.Region;

import java.util.List;
import java.util.UUID;

public interface StockRequestService {

    // CREATE
    StockRequest create(StockRequest request, UUID userId);

    // READ
    List<StockRequest> getAll();

    StockRequest getById(Long id);

    List<StockRequest> getMyRequests(UUID userId);

    List<StockRequest> getByRegion(Region region);

    // UPDATE
    StockRequest update(Long id, StockRequest request);

    // DELETE
    void delete(Long id);

    // BUSINESS ACTIONS
    StockRequest approveRequest(Long requestId);

    StockRequest rejectRequest(Long requestId);

    StockRequest assignDeliveryAgent(Long requestId, UUID deliveryAgentId, String deliveryAgentName, String vehicleType);

    // 🔥 BONUS (recommandé pour ton scheduler)
    void checkAndAutoRequest(PharmacyStock stock);
}
