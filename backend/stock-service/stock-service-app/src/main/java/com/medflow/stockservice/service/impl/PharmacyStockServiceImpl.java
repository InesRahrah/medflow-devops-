package com.medflow.stockservice.service.impl;

import com.medflow.stockservice.entity.PharmacyStock;
import com.medflow.stockservice.repository.PharmacyStockRepository;
import com.medflow.stockservice.service.PharmacyStockService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PharmacyStockServiceImpl implements PharmacyStockService {

    private final PharmacyStockRepository repository;

    @Override
    public PharmacyStock create(PharmacyStock stock) {
        return repository.save(stock);
    }

    @Override
    public List<PharmacyStock> getAll() {
        return repository.findAll();
    }

    @Override
    public List<PharmacyStock> getLowStock() {
        return repository.findAll().stream()
                .filter(s -> s.getAvailableQuantity() <= s.getMinThreshold())
                .toList();
    }

    @Override
    public PharmacyStock getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Stock not found"));
    }

    @Override
    public PharmacyStock update(Long id, PharmacyStock stock) {
        PharmacyStock existing = getById(id);

        if (stock.getAvailableQuantity() != null) {
            existing.setAvailableQuantity(stock.getAvailableQuantity());
        }

        if (stock.getMinThreshold() != null) {
            existing.setMinThreshold(stock.getMinThreshold());
        }

        if (stock.getExpirationDate() != null) {
            existing.setExpirationDate(stock.getExpirationDate());
        }

        // 🔥 mise à jour automatique
        existing.setLastUpdated(LocalDateTime.now());

        return repository.save(existing);
    }

    @Override
    @Transactional
    public void delete(Long id) {

        if (!repository.existsById(id)) {
            throw new RuntimeException("Stock not found");
        }

        repository.deleteById(id);
        repository.flush();
    }
}
