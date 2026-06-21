package com.medflow.stockservice.repository;

import com.medflow.stockservice.entity.RequestItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RequestItemRepository extends JpaRepository<RequestItem, Long> {

    List<RequestItem> findByRequestId(Long requestId);
}
