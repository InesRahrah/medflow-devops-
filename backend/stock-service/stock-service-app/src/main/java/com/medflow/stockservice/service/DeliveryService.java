package com.medflow.stockservice.service;

import com.medflow.stockservice.entity.Delivery;
import java.util.List;
import java.util.UUID;

public interface DeliveryService {
    Delivery create(Delivery delivery);
    List<Delivery> getAll();
    Delivery getById(Long id);
    Delivery update(Long id, Delivery delivery);
    void delete(Long id);
    List<Delivery> getByDeliveryAgent(UUID agentId);
    Delivery acceptDelivery(Long id);
    Delivery completeDelivery(Long id);
}

