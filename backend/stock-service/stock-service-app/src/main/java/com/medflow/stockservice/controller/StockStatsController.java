package com.medflow.stockservice.controller;

import com.medflow.stockservice.dto.StockStatsDTO;
import com.medflow.stockservice.entity.PharmacyStock;
import com.medflow.stockservice.repository.PharmacyStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StockStatsController {

    private final PharmacyStockRepository repository;

    // 📊 STOCK GLOBAL
    @GetMapping("/stock")
    public List<StockStatsDTO> getStockStats() {

        List<PharmacyStock> stocks = repository.findAll();

        int total = stocks.stream()
                .mapToInt(PharmacyStock::getAvailableQuantity)
                .sum();

        List<StockStatsDTO> result = new ArrayList<>();

        for (PharmacyStock stock : stocks) {

            double percentage = total == 0 ? 0 :
                    (stock.getAvailableQuantity() * 100.0) / total;

            result.add(new StockStatsDTO(
                    stock.getProduct().getProductName(),
                    stock.getAvailableQuantity(),
                    Math.round(percentage * 10.0) / 10.0 // 🔥 arrondi 1 décimale
            ));
        }

        return result;
    }

    // ⚠️ PRODUITS CRITIQUES
    @GetMapping("/critical")
    public List<StockStatsDTO> getCriticalStock() {

        List<PharmacyStock> stocks = repository.findAll();

        int totalCritical = stocks.stream()
                .filter(s -> s.getAvailableQuantity() <= s.getMinThreshold())
                .mapToInt(PharmacyStock::getAvailableQuantity)
                .sum();

        List<StockStatsDTO> result = new ArrayList<>();

        for (PharmacyStock stock : stocks) {

            if (stock.getAvailableQuantity() <= stock.getMinThreshold()) {

                double percentage = totalCritical == 0 ? 0 :
                        (stock.getAvailableQuantity() * 100.0) / totalCritical;

                result.add(new StockStatsDTO(
                        stock.getProduct().getProductName(),
                        stock.getAvailableQuantity(),
                        Math.round(percentage * 10.0) / 10.0
                ));
            }
        }

        return result;
    }
}

