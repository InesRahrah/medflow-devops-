package com.medflow.userservice.controller;

import com.medflow.userservice.dto.BaseUserResponse;
import com.medflow.userservice.dto.LaboratoryUserResponse;
import com.medflow.userservice.repository.DeliveryAgentRepository;
import com.medflow.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/internal")
@RequiredArgsConstructor
public class InternalUserController {

    private final UserService userService;

    private final DeliveryAgentRepository deliveryAgentRepository;

    @GetMapping("/users/{id}")
    public ResponseEntity<BaseUserResponse> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserProfileById(id));
    }

    @GetMapping("/laboratories")
    public ResponseEntity<List<LaboratoryUserResponse>> getLaboratories() {
        return ResponseEntity.ok(userService.getAllLaboratoryProfiles());
    }

    @GetMapping("/delivery-agents")
    public ResponseEntity<List<?>> getDeliveryAgents() {

        List<?> agents = deliveryAgentRepository.findAll()
                .stream()
                .map(agent -> new Object() {
                    public UUID id = agent.getUserId();
                    public String name = agent.getDeliveryName();
                    public String vehicleType = agent.getVehicleType();
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(agents);
    }

}
