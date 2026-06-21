package com.medflow.stockservice.repository;

import com.medflow.stockservice.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    boolean existsByStockId(Long stockId); // 🔥 évite duplication
    List<Alert> findByPharmacistId(UUID pharmacistId);
}
