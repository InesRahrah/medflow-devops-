package com.medflow.appointmentservice.service;

import com.medflow.appointmentservice.entity.Appointment;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ZoomMeetingService {

    private static final DateTimeFormatter ISO_DATE_TIME = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    private final RestTemplate restTemplate;

    @Value("${zoom.api-base-url:https://api.zoom.us/v2}")
    private String zoomApiBaseUrl;

    @Value("${zoom.oauth-url:https://zoom.us/oauth/token}")
    private String zoomOAuthUrl;

    @Value("${zoom.account-id:}")
    private String zoomAccountId;

    @Value("${zoom.client-id:}")
    private String zoomClientId;

    @Value("${zoom.client-secret:}")
    private String zoomClientSecret;

    @Value("${zoom.user-id:me}")
    private String zoomUserId;

    @Value("${zoom.meeting.duration-minutes:30}")
    private int zoomMeetingDurationMinutes;

    @Value("${zoom.meeting.timezone:UTC}")
    private String zoomMeetingTimezone;

    public ZoomMeetingService(RestTemplateBuilder restTemplateBuilder) {
        this.restTemplate = restTemplateBuilder.build();
    }

    public ZoomMeetingDetails createMeetingForAppointment(Appointment appointment) {
        return createMeetingForAppointment(appointment, null);
    }

    public ZoomMeetingDetails createMeetingForAppointment(Appointment appointment, String zoomUserIdOverride) {
        validateConfig();

        String accessToken = fetchAccessToken();
        String resolvedZoomUserId = (zoomUserIdOverride == null || zoomUserIdOverride.isBlank())
                ? ((zoomUserId == null || zoomUserId.isBlank()) ? "me" : zoomUserId.trim())
                : zoomUserIdOverride.trim();
        String createMeetingUrl = normalizeBaseUrl(zoomApiBaseUrl) + "/users/" + resolvedZoomUserId + "/meetings";

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("topic", buildTopic(appointment));
        payload.put("type", 2);
        payload.put("start_time", resolveStartTime(appointment));
        payload.put("duration", zoomMeetingDurationMinutes <= 0 ? 30 : zoomMeetingDurationMinutes);
        payload.put("timezone", (zoomMeetingTimezone == null || zoomMeetingTimezone.isBlank()) ? "UTC" : zoomMeetingTimezone.trim());

        Map<String, Object> settings = new LinkedHashMap<>();
        settings.put("join_before_host", true);
        settings.put("waiting_room", true);
        payload.put("settings", settings);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
        ResponseEntity<Map> response = restTemplate.exchange(createMeetingUrl, HttpMethod.POST, request, Map.class);

        Map<String, Object> body = response.getBody();
        if (body == null || body.get("join_url") == null) {
            throw new IllegalStateException("Zoom meeting creation failed: join_url was not returned.");
        }

        String joinUrl = String.valueOf(body.get("join_url"));
        String meetingId = body.get("id") == null ? null : String.valueOf(body.get("id"));
        String password = body.get("password") == null ? null : String.valueOf(body.get("password"));

        return new ZoomMeetingDetails(joinUrl, meetingId, password);
    }

    private String fetchAccessToken() {
        String tokenUrl = UriComponentsBuilder.fromHttpUrl(zoomOAuthUrl)
                .queryParam("grant_type", "account_credentials")
                .queryParam("account_id", zoomAccountId)
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + base64(zoomClientId + ":" + zoomClientSecret));

        HttpEntity<Void> request = new HttpEntity<>(headers);
        ResponseEntity<Map> response = restTemplate.exchange(tokenUrl, HttpMethod.POST, request, Map.class);

        Map<String, Object> body = response.getBody();
        if (body == null || body.get("access_token") == null) {
            throw new IllegalStateException("Zoom OAuth failed: access_token was not returned.");
        }

        return String.valueOf(body.get("access_token"));
    }

    private String buildTopic(Appointment appointment) {
        Long appointmentId = appointment != null ? appointment.getIdAp() : null;
        return appointmentId == null ? "MedFlow Telemedicine Appointment" : "MedFlow Appointment #" + appointmentId;
    }

    private String resolveStartTime(Appointment appointment) {
        LocalDateTime scheduled = appointment != null ? appointment.getScheduledAt() : null;
        if (scheduled == null) {
            scheduled = LocalDateTime.now().plusMinutes(5);
        }
        return scheduled.atZone(ZoneId.systemDefault()).toOffsetDateTime().format(ISO_DATE_TIME);
    }

    private String normalizeBaseUrl(String value) {
        if (value == null || value.isBlank()) {
            return "https://api.zoom.us/v2";
        }
        String trimmed = value.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    private String base64(String raw) {
        return Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private void validateConfig() {
        if (isBlank(zoomAccountId) || isBlank(zoomClientId) || isBlank(zoomClientSecret)) {
            throw new IllegalStateException(
                    "Zoom is enabled but credentials are missing. Set zoom.account-id, zoom.client-id, and zoom.client-secret."
            );
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public record ZoomMeetingDetails(String joinUrl, String meetingId, String password) {
    }
}
