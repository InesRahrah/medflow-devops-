package com.medflow.stockservice.service;

import com.medflow.stockservice.entity.Alert;
import com.medflow.stockservice.entity.PharmacyStock;
import com.medflow.stockservice.repository.AlertRepository;
import com.medflow.stockservice.repository.PharmacyStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final PharmacyStockRepository stockRepository;
    private final AlertRepository alertRepository;

    public void generateExpirationAlerts(UUID pharmacistId) {

        LocalDateTime limit = LocalDateTime.now().plusDays(30);

        List<PharmacyStock> stocks =
                stockRepository.findExpiringSoon(limit);

        for (PharmacyStock stock : stocks) {

            boolean exists = alertRepository
                    .existsByStockId(stock.getId());

            if (!exists) {
                Alert alert = Alert.builder()
                        .message("⚠️ " + stock.getProduct().getProductName()
                                + " expires on " + stock.getExpirationDate())
                        .createdAt(LocalDateTime.now())
                        .isRead(false)
                        .stockId(stock.getId())
                        .pharmacistId(stock.getPharmacistId())
                        .build();

                alertRepository.save(alert);
            }
        }
    }
}
////helloooooo
