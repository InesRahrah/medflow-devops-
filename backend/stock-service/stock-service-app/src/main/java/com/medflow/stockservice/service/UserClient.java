package com.medflow.stockservice.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class UserClient {

    private final RestTemplate restTemplate = new RestTemplate();

    public List<Map<String, Object>> getDeliveryAgents() {

        String url = "http://localhost:8080/api/v1/internal/delivery-agents";

        Map[] response = restTemplate.getForObject(url, Map[].class);

        return Arrays.asList(response);
    }


    public String getUserEmail(UUID userId) {

        String url = "http://localhost:8080/api/v1/internal/users/" + userId;

        Map response = restTemplate.getForObject(url, Map.class);

        return response.get("email").toString();
    }
}
