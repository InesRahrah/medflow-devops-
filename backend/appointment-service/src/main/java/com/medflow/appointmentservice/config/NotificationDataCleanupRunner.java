package com.medflow.appointmentservice.config;

import com.medflow.appointmentservice.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class NotificationDataCleanupRunner {

    private static final Logger log = LoggerFactory.getLogger(NotificationDataCleanupRunner.class);

    private final NotificationService notificationService;

    public NotificationDataCleanupRunner(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void cleanupLegacyNotifications() {
        int updated = notificationService.cleanupLegacyUnknownUserMessages();
        if (updated > 0) {
            log.info("Legacy notification cleanup updated {} row(s) (message sanitization and notificationId UUID backfill).", updated);
        } else {
            log.info("Legacy notification cleanup found no rows to update.");
        }
    }
}
