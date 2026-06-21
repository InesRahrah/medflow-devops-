package com.medflow.stockservice.service.impl;

import com.medflow.stockservice.entity.Delivery;
import com.medflow.stockservice.entity.enums.DeliveryStatus;
import com.medflow.stockservice.repository.DeliveryRepository;
import com.medflow.stockservice.service.DeliveryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeliveryServiceImpl implements DeliveryService {

    private final DeliveryRepository repository;

    @Override
    public Delivery create(Delivery delivery) {
        return repository.save(delivery);
    }

    @Override
    public List<Delivery> getAll() {
        return repository.findAll();
    }

    @Override
    public Delivery getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Delivery not found"));
    }
    @Override
    public Delivery update(Long id, Delivery delivery) {
        Delivery existing = getById(id);

        if (delivery.getDeliveryStatus() != null) {
            existing.setDeliveryStatus(delivery.getDeliveryStatus());
        }

        if (delivery.getDeliveryDate() != null) {
            existing.setDeliveryDate(delivery.getDeliveryDate());
        }

        if (delivery.getTrackingNumber() != null) {
            existing.setTrackingNumber(delivery.getTrackingNumber());
        }

        return repository.save(existing);
    }
    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }


    @Override
    public List<Delivery> getByDeliveryAgent(UUID agentId) {
        return repository.findByDeliveryAgentId(agentId);
    }

    public Delivery acceptDelivery(Long id) {
        Delivery delivery = getById(id);

        delivery.setDeliveryStatus(DeliveryStatus.IN_PROGRESS);

        return repository.save(delivery);
    }

    public Delivery completeDelivery(Long id) {
        Delivery delivery = getById(id);

        delivery.setDeliveryStatus(DeliveryStatus.DELIVERED);

        return repository.save(delivery);
    }
}
