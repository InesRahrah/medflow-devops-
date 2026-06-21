package com.medflow.stockservice.service;

import org.springframework.stereotype.Service;

@Service
public class QrCodeService {

    public String generateQrUrl(Long productId) {
        return "http://localhost:4200/drug/" + productId;
    }
}
