package com.medflow.stockservice.service.impl;

import com.medflow.stockservice.entity.PharmacyProduct;
import com.medflow.stockservice.repository.PharmacyProductRepository;
import com.medflow.stockservice.service.PharmacyProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PharmacyProductServiceImpl implements PharmacyProductService {

    private final PharmacyProductRepository repository;

    @Override
    public PharmacyProduct create(PharmacyProduct product) {
        return repository.save(product);
    }

    @Override
    public List<PharmacyProduct> getAll() {
        return repository.findAll();
    }

    @Override
    public PharmacyProduct getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }

    @Override
    public PharmacyProduct update(Long id, PharmacyProduct product) {
        PharmacyProduct existing = getById(id);

        if (product.getProductName() != null) {
            existing.setProductName(product.getProductName());
        }

        if (product.getType() != null) {
            existing.setType(product.getType());
        }

        if (product.getForm() != null) {
            existing.setForm(product.getForm());
        }

        if (product.getDosage() != null) {
            existing.setDosage(product.getDosage());
        }

        if (product.getManufacturer() != null) {
            existing.setManufacturer(product.getManufacturer());
        }

        if (product.getPrescriptionType() != null) {
            existing.setPrescriptionType(product.getPrescriptionType());
        }

        return repository.save(existing);
    }

}

