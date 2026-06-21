package com.medflow.stockservice.service.impl;

import com.medflow.stockservice.entity.*;
import com.medflow.stockservice.entity.enums.DeliveryStatus;
import com.medflow.stockservice.entity.enums.PriorityLevel;
import com.medflow.stockservice.entity.enums.Region;
import com.medflow.stockservice.entity.enums.RequestStatus;
import com.medflow.stockservice.repository.AlertRepository;
import com.medflow.stockservice.repository.PharmacyStockRepository;
import com.medflow.stockservice.repository.StockRequestRepository;
import com.medflow.stockservice.service.EmailService;
import com.medflow.stockservice.service.StockRequestService;
import com.medflow.stockservice.service.UserClient;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StockRequestServiceImpl implements StockRequestService {

    private final StockRequestRepository repository;
    private final PharmacyStockRepository stockRepository;
    private final AlertRepository alertRepository;

    private final EmailService emailService;
    private final UserClient userClient;

    @Override
    public StockRequest create(StockRequest request, UUID userId) {

        request.setPharmacistId(userId);
        request.setRequestDate(LocalDateTime.now());
        request.setRequestStatus(RequestStatus.PENDING);

        if (request.getRegion() == null) {
            throw new RuntimeException("Region is required");
        }

        return repository.save(request);
    }

    @Override
    public List<StockRequest> getAll() {
        return repository.findAll();
    }

    @Override
    public StockRequest getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));
    }

    @Override
    public StockRequest update(Long id, StockRequest request) {
        StockRequest existing = getById(id);

        if (request.getRequestStatus() != null) {
            existing.setRequestStatus(request.getRequestStatus());
        }

        if (request.getRequestPriority() != null) {
            existing.setRequestPriority(request.getRequestPriority());
        }

        if (request.getRequestComment() != null) {
            existing.setRequestComment(request.getRequestComment());
        }

        return repository.save(existing);
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }

    @Override
    public List<StockRequest> getByRegion(Region region) {
        return repository.findByRegion(region);
    }

    @Override
    public List<StockRequest> getMyRequests(UUID userId) {
        return repository.findByPharmacistIdWithItems(userId); // ✅ FIX
    }

    @Override
    public StockRequest approveRequest(Long requestId) {

        StockRequest request = getById(requestId);

        request.setRequestStatus(RequestStatus.APPROVED);

        String email = userClient.getUserEmail(request.getPharmacistId());

        // ✅ envoyer email
        emailService.sendApprovalEmail(email, request.getItems());

        return repository.save(request);
    }

    @Override
    public StockRequest rejectRequest(Long requestId) {

        StockRequest request = getById(requestId);

        request.setRequestStatus(RequestStatus.REJECTED);

        String email = userClient.getUserEmail(request.getPharmacistId());

        // ❌ AVANT : rien
        // ✅ MAINTENANT :
        emailService.sendRejectionEmail(email, request.getItems());
        return repository.save(request);
    }



    @Override
    public StockRequest assignDeliveryAgent(Long requestId,
                                            UUID deliveryAgentId,
                                            String deliveryAgentName,
                                            String vehicleType) {

        StockRequest request = getById(requestId);

        if (request.getRequestStatus() != RequestStatus.APPROVED) {
            throw new RuntimeException("Request must be APPROVED first");
        }

        Delivery delivery = request.getDelivery();

        if (delivery == null) {
            delivery = new Delivery();
            delivery.setRequest(request);
        }

        delivery.setDeliveryStatus(DeliveryStatus.PENDING);
        delivery.setDeliveryDate(LocalDateTime.now());
        delivery.setTrackingNumber("TRK-" + requestId);

        delivery.setDeliveryAgentId(deliveryAgentId);
        delivery.setDeliveryAgentName(deliveryAgentName);
        delivery.setVehicleType(vehicleType);

        request.setDelivery(delivery);

        // 🔥 IMPORTANT : forcer la sauvegarde
        StockRequest saved = repository.save(request);

        return saved;
    }




    public void checkAndAutoRequest(PharmacyStock stock) {

        if (stock.getAvailableQuantity() <= stock.getMinThreshold()) {

            boolean exists = repository.existsByStockIdAndRequestStatusIn(
                    stock.getId(),
                    List.of(RequestStatus.PENDING, RequestStatus.APPROVED)
            );

            if (!exists) {
                createAutoRequest(stock);
            }
        }
    }

    private void createAutoRequest(PharmacyStock stock) {

        StockRequest request = new StockRequest();

        request.setRequestDate(LocalDateTime.now());
        request.setRequestStatus(RequestStatus.PENDING);
        request.setRequestPriority(PriorityLevel.HIGH);

        request.setStockId(stock.getId());
        request.setRequestComment("AUTO: Low stock");

        // ⚠️ IMPORTANT : tu n’as pas region ici → mets une valeur fixe pour test
        request.setRegion(Region.TUNIS);

        // ⚠️ pareil pour pharmacistId
        request.setPharmacistId(stock.getPharmacistId()); // ✅

        // 🔥 créer item
        RequestItem item = new RequestItem();
        item.setRequestedQuantity(stock.getMinThreshold() * 2);
        item.setRequest(request);
        item.setProduct(stock.getProduct()); // 🔥 IMPORTANT

        request.setItems(List.of(item));

        repository.save(request);

        System.out.println("✅ AUTO REQUEST CREATED for stock: " + stock.getId());
    }




    @Scheduled(fixedRate = 60000) // chaque 1 min
    public void autoCheckStocks() {

        List<PharmacyStock> stocks = stockRepository.findAll();

        for (PharmacyStock stock : stocks) {
            checkAndAutoRequest(stock);
            checkExpiration(stock);
        }

        System.out.println("🔄 Checking stocks...");
    }


    public void checkExpiration(PharmacyStock stock) {

        if (stock.getExpirationDate() == null) return;

        LocalDateTime now = LocalDateTime.now();

        // 🔥 1 month = 30 days
        if (stock.getExpirationDate().isBefore(now.plusDays(30))) {

            if (!alertRepository.existsByStockId(stock.getId())) {

                String message;

                // 🔴 CRITICAL (1 day)
                if (stock.getExpirationDate().isBefore(now.plusDays(1))) {
                    message = "🔴 CRITICAL: "
                            + stock.getProduct().getProductName()
                            + " expires tomorrow";

                    // 🟠 WARNING (3 days)
                } else if (stock.getExpirationDate().isBefore(now.plusDays(3))) {
                    message = "🟠 WARNING: "
                            + stock.getProduct().getProductName()
                            + " will expire soon";

                    // 🟡 MEDIUM (7 days)
                } else if (stock.getExpirationDate().isBefore(now.plusDays(7))) {
                    message = "🟡 ATTENTION: "
                            + stock.getProduct().getProductName()
                            + " will expire in less than 7 days";

                    // 🔵 INFO (1 month)
                } else {
                    message = "🔵 INFO: "
                            + stock.getProduct().getProductName()
                            + " will expire in less than one month";
                }

                Alert alert = Alert.builder()
                        .message(message)
                        .createdAt(LocalDateTime.now())
                        .isRead(false)
                        .stockId(stock.getId())
                        .pharmacistId(stock.getPharmacistId())
                        .build();

                alertRepository.save(alert);

                System.out.println("⚠️ EXPIRATION ALERT CREATED for stock: " + stock.getId());
            }
        }
    }
}
