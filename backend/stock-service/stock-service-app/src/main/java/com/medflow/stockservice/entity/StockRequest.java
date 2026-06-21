package com.medflow.stockservice.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.medflow.stockservice.entity.enums.PriorityLevel;
import com.medflow.stockservice.entity.enums.Region;
import com.medflow.stockservice.entity.enums.RequestStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime requestDate;

    @Enumerated(EnumType.STRING)
    private RequestStatus requestStatus;

    @Enumerated(EnumType.STRING)
    private PriorityLevel requestPriority;

    private UUID pharmacistId;

    private String requestComment;

    @Enumerated(EnumType.STRING)
    private Region region;

    private Long stockId;


    private Double latitude;
    private Double longitude;
    private String hospitalName;

    // ✅ FIX JSON LOOP
    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<RequestItem> items;

    @OneToOne(mappedBy = "request", cascade = CascadeType.ALL)
    @JsonIgnoreProperties("request")
    private Delivery delivery;
}
