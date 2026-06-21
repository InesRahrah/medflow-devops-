package com.medflow.stockservice.service.impl;

import com.medflow.stockservice.entity.PharmacyProduct;
import com.medflow.stockservice.entity.RequestItem;
import com.medflow.stockservice.entity.StockRequest;
import com.medflow.stockservice.repository.PharmacyProductRepository;
import com.medflow.stockservice.repository.RequestItemRepository;
import com.medflow.stockservice.repository.StockRequestRepository;
import com.medflow.stockservice.service.RequestItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RequestItemServiceImpl implements RequestItemService {

    private final RequestItemRepository repository;
    private final PharmacyProductRepository productRepository;
    private final StockRequestRepository requestRepository;

    @Override
    public RequestItem create(RequestItem item) {

        if (item.getProduct() == null || item.getProduct().getId() == null) {
            throw new RuntimeException("Product ID is required");
        }

        if (item.getRequest() == null || item.getRequest().getId() == null) {
            throw new RuntimeException("Request ID is required");
        }

        PharmacyProduct product = productRepository.findById(
                item.getProduct().getId()
        ).orElseThrow(() -> new RuntimeException("Product not found"));

        StockRequest request = requestRepository.findById(
                item.getRequest().getId()
        ).orElseThrow(() -> new RuntimeException("Request not found"));

        item.setProduct(product);
        item.setRequest(request);

        // ✅ IMPORTANT : ajouter dans la liste
        if (request.getItems() != null) {
            request.getItems().add(item);
        }

        return repository.save(item);
    }


    @Override
    public List<RequestItem> getAll() {
        return repository.findAll();
    }

    @Override
    public RequestItem getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found"));
    }

    @Override
    public RequestItem update(Long id, RequestItem item) {
        RequestItem existing = getById(id);

        if (item.getRequestedQuantity() != null) {
            existing.setRequestedQuantity(item.getRequestedQuantity());
        }

        if (item.getItemNote() != null) {
            existing.setItemNote(item.getItemNote());
        }

        if (item.getProduct() != null) {
            existing.setProduct(item.getProduct());
        }

        return repository.save(existing);
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }


    @Override
    public List<RequestItem> getByRequestId(Long requestId) {
        return repository.findByRequestId(requestId);
    }
}
