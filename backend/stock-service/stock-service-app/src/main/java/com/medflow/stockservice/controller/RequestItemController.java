package com.medflow.stockservice.controller;

import com.medflow.stockservice.entity.RequestItem;
import com.medflow.stockservice.service.RequestItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/request-items")
@RequiredArgsConstructor
public class RequestItemController {

    private final RequestItemService service;

    @PostMapping
    public RequestItem create(@RequestBody RequestItem item) {
        return service.create(item);
    }

    @GetMapping
    public List<RequestItem> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public RequestItem getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PutMapping("/{id}")
    public RequestItem update(@PathVariable Long id, @RequestBody RequestItem item) {
        return service.update(id, item);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }


    @GetMapping("/request/{requestId}")
    public List<RequestItem> getByRequestId(@PathVariable Long requestId) {
        return service.getByRequestId(requestId);
    }
}
