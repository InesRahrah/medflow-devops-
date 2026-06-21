package com.medflow.stockservice.controller;

import com.medflow.stockservice.entity.Alert;
import com.medflow.stockservice.repository.AlertRepository;
import com.medflow.stockservice.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertRepository alertRepository;

    // 🔥 ALERTES DU PHARMACIEN CONNECTÉ
    @GetMapping("/my")
    public List<Alert> getMyAlerts(@RequestHeader("userId") UUID userId) {
        return alertRepository.findByPharmacistId(userId);
    }

    // 🔥 OPTIONNEL : toutes les alertes (admin)
    @GetMapping
    public List<Alert> getAllAlerts() {
        return alertRepository.findAll();
    }

    @Autowired
    private AlertService alertService;

    @GetMapping("/check-expiration")
    public String checkExpiration(@RequestHeader("userId") UUID userId) {

        alertService.generateExpirationAlerts(userId);

        return "Alerts generated";
    }
}
