package com.medflow.stockservice.service;

import com.medflow.stockservice.entity.PharmacyStock;
import java.util.List;

public interface PharmacyStockService {
    PharmacyStock create(PharmacyStock stock);
    List<PharmacyStock> getAll();
    List<PharmacyStock> getLowStock();
    PharmacyStock getById(Long id);
    PharmacyStock update(Long id, PharmacyStock stock);
    void delete(Long id);
}
