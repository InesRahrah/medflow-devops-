package com.medflow.stockservice.repository;

import com.medflow.stockservice.entity.StockRequest;
import com.medflow.stockservice.entity.enums.Region;
import com.medflow.stockservice.entity.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface StockRequestRepository extends JpaRepository<StockRequest, Long> {

    List<StockRequest> findByRegion(Region region);

    List<StockRequest> findByPharmacistId(UUID pharmacistId);

    List<StockRequest> findByRegionAndRequestStatus(Region region, RequestStatus status);

    @Query("""
    SELECT DISTINCT r FROM StockRequest r
    LEFT JOIN FETCH r.items i
    LEFT JOIN FETCH i.product
    LEFT JOIN FETCH r.delivery
    WHERE r.pharmacistId = :userId
""")
    List<StockRequest> findByPharmacistIdWithItems(@Param("userId") UUID userId);

    boolean existsByStockIdAndRequestStatusIn(
            Long stockId,
            List<RequestStatus> statuses
    );
}
