package com.medflow.appointmentservice.controller;

import com.medflow.appointmentservice.dto.NotificationRequest;
import com.medflow.appointmentservice.dto.NotificationResponse;
import com.medflow.appointmentservice.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping("/internal")
    @ResponseStatus(HttpStatus.CREATED)
    public NotificationResponse createInternal(@RequestBody NotificationRequest request) {
        return notificationService.create(request);
    }

    @GetMapping
    public List<NotificationResponse> getNotifications(@RequestParam("userId") UUID userId) {
        return notificationService.getByRecipient(userId);
    }
}
