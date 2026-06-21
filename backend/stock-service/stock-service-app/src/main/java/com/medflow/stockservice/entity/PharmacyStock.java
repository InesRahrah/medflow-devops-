package com.medflow.stockservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer availableQuantity;
    private Integer minThreshold;

    private LocalDateTime lastUpdated;


    private LocalDateTime expirationDate;


    @OneToOne
    @JoinColumn(name = "product_id", unique = true)
    private PharmacyProduct product;

    private UUID pharmacistId; // 🔥 AJOUT
}
