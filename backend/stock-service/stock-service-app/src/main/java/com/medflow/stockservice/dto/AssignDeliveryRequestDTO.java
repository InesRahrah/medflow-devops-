package com.medflow.stockservice.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class AssignDeliveryRequestDTO {
    private UUID deliveryAgentId;
    private String deliveryAgentName;
    private String vehicleType;
}
