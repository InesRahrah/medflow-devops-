package com.medflow.stockservice.controller;

import com.medflow.stockservice.entity.Delivery;
import com.medflow.stockservice.service.DeliveryService;
import com.medflow.stockservice.service.UserClient;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/deliveries")
@RequiredArgsConstructor
public class DeliveryController {

    private final DeliveryService service;

    private final UserClient userClient;


    @PostMapping
    public Delivery create(@RequestBody Delivery delivery) {
        return service.create(delivery);
    }

    @GetMapping
    public List<Delivery> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public Delivery getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PutMapping("/{id}")
    public Delivery update(@PathVariable Long id, @RequestBody Delivery delivery) {
        return service.update(id, delivery);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }


    @GetMapping("/my")
    public List<Delivery> getMyDeliveries(@RequestHeader("userId") UUID userId) {
        return service.getByDeliveryAgent(userId);
    }

    @PutMapping("/{id}/accept")
    public Delivery acceptDelivery(@PathVariable Long id) {
        return service.acceptDelivery(id);
    }

    @PutMapping("/{id}/complete")
    public Delivery completeDelivery(@PathVariable Long id) {
        return service.completeDelivery(id);
    }


    @GetMapping("/agents")
    public List<Map<String, Object>> getAgents() {
        return userClient.getDeliveryAgents();
    }
}
