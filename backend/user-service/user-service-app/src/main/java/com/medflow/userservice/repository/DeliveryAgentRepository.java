package com.medflow.userservice.repository;

import com.medflow.userservice.entity.DeliveryAgentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface DeliveryAgentRepository extends JpaRepository<DeliveryAgentProfile, UUID> {
}
