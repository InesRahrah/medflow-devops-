package com.medflow.stockservice.repository;

import com.medflow.stockservice.entity.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

    List<Delivery> findByDeliveryAgentId(UUID deliveryAgentId);
}
