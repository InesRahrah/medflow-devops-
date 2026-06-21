package com.medflow.stockservice.controller;

import com.medflow.stockservice.entity.PharmacyProduct;
import com.medflow.stockservice.service.PharmacyProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class PharmacyProductController {

    private final PharmacyProductService service;

    @PostMapping
    public PharmacyProduct create(@RequestBody PharmacyProduct product) {
        return service.create(product);
    }

    @GetMapping
    public List<PharmacyProduct> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public PharmacyProduct getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
    @PutMapping("/{id}")
    public PharmacyProduct update(@PathVariable Long id, @RequestBody PharmacyProduct product) {
        return service.update(id, product);
    }
}
