package com.medflow.stockservice.repository;

import com.medflow.stockservice.entity.PharmacyStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PharmacyStockRepository extends JpaRepository<PharmacyStock, Long> {

    @Query("SELECT p.product.productName, p.availableQuantity FROM PharmacyStock p")
    List<Object[]> getStockStats();

    @Query("""
SELECT s FROM PharmacyStock s
WHERE s.expirationDate IS NOT NULL
AND s.expirationDate <= :limitDate
""")
    List<PharmacyStock> findExpiringSoon(@Param("limitDate") LocalDateTime limitDate);
}
