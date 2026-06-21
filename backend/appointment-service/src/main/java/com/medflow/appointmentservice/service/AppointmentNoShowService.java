package com.medflow.appointmentservice.service;

import com.medflow.appointmentservice.entity.Appointment;
import com.medflow.appointmentservice.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentNoShowService {

    private static final String STATUS_SCHEDULED = "SCHEDULED";
    private static final String STATUS_NO_SHOW = "NO_SHOW";

    private final AppointmentRepository appointmentRepository;
    private final PatientPenaltyService patientPenaltyService;

    @Value("${penalty.policy.no-show-grace-minutes:15}")
    private long noShowGraceMinutes;

    @Scheduled(cron = "${penalty.policy.no-show-cron:0 */5 * * * *}")
    @Transactional
    public void markNoShows() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(noShowGraceMinutes);
        List<Appointment> overdueScheduled = appointmentRepository.findByStatusAndScheduledAtBefore(STATUS_SCHEDULED, cutoff);

        for (Appointment appointment : overdueScheduled) {
            appointment.setStatus(STATUS_NO_SHOW);
            appointment.setPendingScheduledAt(null);
            appointment.setPendingStatus(null);
            appointment.setAwaitingDoctorConfirmation(false);
            appointment.setAwaitingPatientConfirmation(false);
            appointmentRepository.save(appointment);
            patientPenaltyService.recordNoShow(appointment);
        }

        if (!overdueScheduled.isEmpty()) {
            log.info("Marked {} appointments as NO_SHOW", overdueScheduled.size());
        }
    }
}
