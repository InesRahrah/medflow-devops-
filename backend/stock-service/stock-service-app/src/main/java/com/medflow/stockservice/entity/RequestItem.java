package com.medflow.stockservice.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequestItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer requestedQuantity;

    private String itemNote;

    @ManyToOne
    @JoinColumn(name = "request_id")
    @JsonBackReference // ✅ FIX LOOP
    private StockRequest request;

    @ManyToOne(fetch = FetchType.EAGER) // ✅ IMPORTANT
    @JoinColumn(name = "product_id")
    private PharmacyProduct product;
}
