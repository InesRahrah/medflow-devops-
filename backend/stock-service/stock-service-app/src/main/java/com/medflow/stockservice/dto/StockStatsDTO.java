package com.medflow.stockservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class StockStatsDTO {
    private String productName;
    private int quantity;
    private double percentage; // 🔥 AJOUT
}
