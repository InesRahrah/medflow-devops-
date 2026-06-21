package com.medflow.appointmentservice.repository;

import com.medflow.appointmentservice.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(UUID recipientId);
    List<Notification> findByMessageContainingIgnoreCase(String token);
    List<Notification> findByNotificationIdIsNull();
    boolean existsByAppointmentIdAndEventTypeAndRecipientId(Long appointmentId, String eventType, UUID recipientId);
}
