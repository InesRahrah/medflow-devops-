package com.medflow.stockservice.service;

import com.medflow.stockservice.entity.PharmacyProduct;
import java.util.List;

public interface PharmacyProductService {
    PharmacyProduct create(PharmacyProduct product);
    List<PharmacyProduct> getAll();
    PharmacyProduct getById(Long id);
    void delete(Long id);
    PharmacyProduct update(Long id, PharmacyProduct product);
}
