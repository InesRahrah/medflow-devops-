package com.medflow.stockservice.service;

import com.medflow.stockservice.entity.RequestItem;
import java.util.List;

public interface RequestItemService {
    RequestItem create(RequestItem item);
    List<RequestItem> getAll();
    RequestItem getById(Long id);
    RequestItem update(Long id, RequestItem item);
    void delete(Long id);
    List<RequestItem> getByRequestId(Long requestId);
}
