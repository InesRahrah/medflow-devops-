package com.medflow.stockservice.repository;

import com.medflow.stockservice.entity.PharmacyProduct;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PharmacyProductRepository extends JpaRepository<PharmacyProduct, Long> {
}
