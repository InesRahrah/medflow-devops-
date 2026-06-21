package com.medflow.stockservice.controller;

import com.medflow.stockservice.entity.PharmacyStock;
import com.medflow.stockservice.service.PharmacyStockService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
public class PharmacyStockController {

    private final PharmacyStockService service;

    @PostMapping
    public PharmacyStock create(@RequestBody PharmacyStock stock) {
        return service.create(stock);
    }

    @GetMapping
    public List<PharmacyStock> getAll() {
        return service.getAll();
    }

    @GetMapping("/low")
    public List<PharmacyStock> getLowStock() {
        return service.getLowStock();
    }

    @GetMapping("/{id}")
    public PharmacyStock getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PutMapping("/{id}")
    public PharmacyStock update(@PathVariable Long id, @RequestBody PharmacyStock stock) {
        return service.update(id, stock);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
