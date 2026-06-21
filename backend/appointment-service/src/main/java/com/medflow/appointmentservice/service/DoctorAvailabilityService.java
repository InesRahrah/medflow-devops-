package com.medflow.appointmentservice.service;

import com.medflow.appointmentservice.repository.AppointmentRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DoctorAvailabilityService {

    private static final LocalTime WORK_START = LocalTime.of(9, 0);
    private static final LocalTime WORK_END = LocalTime.of(17, 0);
    private static final int SLOT_MINUTES = 30;
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private final AppointmentRepository appointmentRepository;

    public DoctorAvailabilityService(AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    /**
     * Returns dates in the given month/year that have at least one open slot for the doctor.
     */
    public List<String> getAvailableDates(UUID doctorId, int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate today = LocalDate.now();
        List<String> availableDates = new ArrayList<>();

        for (int day = 1; day <= ym.lengthOfMonth(); day++) {
            LocalDate date = ym.atDay(day);
            if (date.isBefore(today)) continue;                // skip past dates
            if (!getAvailableSlots(doctorId, date).isEmpty()) {
                availableDates.add(date.format(DATE_FMT));
            }
        }
        return availableDates;
    }

    /**
     * Returns free time slots (HH:mm) for a doctor on a specific date.
     * Slots are 30-minute intervals between 09:00 and 17:00 not already booked.
     */
    public List<String> getAvailableSlots(UUID doctorId, LocalDate date) {
        LocalDateTime dayStart = date.atTime(WORK_START);
        LocalDateTime dayEnd = date.atTime(WORK_END);

        Set<LocalDateTime> bookedSlots = appointmentRepository
                .findByIdDoctorAndScheduledAtBetween(doctorId, dayStart, dayEnd)
                .stream()
                .filter(a -> !"CANCELLED".equalsIgnoreCase(a.getStatus()) && !"REJECTED_BY_DOCTOR".equalsIgnoreCase(a.getStatus()))
                .map(a -> a.getScheduledAt().withSecond(0).withNano(0))
                .collect(Collectors.toSet());

        List<String> slots = new ArrayList<>();
        LocalDateTime cursor = dayStart;
        LocalDateTime now = LocalDateTime.now();
        while (!cursor.isAfter(dayEnd.minusMinutes(SLOT_MINUTES))) {
            // If the date is today, skip slots before now
            if (!date.isAfter(now.toLocalDate()) && cursor.isBefore(now)) {
                cursor = cursor.plusMinutes(SLOT_MINUTES);
                continue;
            }
            if (!bookedSlots.contains(cursor)) {
                slots.add(cursor.toLocalTime().format(TIME_FMT));
            }
            cursor = cursor.plusMinutes(SLOT_MINUTES);
        }
        return slots;
    }
}
