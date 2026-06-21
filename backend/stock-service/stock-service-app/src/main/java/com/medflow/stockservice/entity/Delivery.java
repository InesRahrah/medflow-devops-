package com.medflow.stockservice.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.medflow.stockservice.entity.enums.DeliveryStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeliveryStatus deliveryStatus;

    private LocalDateTime deliveryDate;
    private String trackingNumber;

    @OneToOne
    @JoinColumn(name = "request_id")
    @JsonIgnoreProperties("delivery")
    private StockRequest request;

    // 🔥 UUID au lieu de Long
    private UUID deliveryAgentId;
    private String deliveryAgentName;
    private String vehicleType; // 🔥 AJOUT

    private Long supplierId;
}
