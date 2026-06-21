package com.medflow.userservice.service;

import com.medflow.userservice.dto.AccessCodeResponse;
import com.medflow.userservice.dto.ValidateAccessCodeResponse;
import com.medflow.userservice.entity.PatientAccessCode;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import com.medflow.userservice.repository.PatientAccessCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDateTime;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
@RequiredArgsConstructor
public class PatientAccessCodeService {

    private static final String ALPHANUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int CODE_LENGTH = 5;

    private final PatientAccessCodeRepository patientAccessCodeRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public AccessCodeResponse getOrRotateCode(User currentUser) {
        validatePatientRole(currentUser);

        PatientAccessCode current = patientAccessCodeRepository
                .findByPatient_Id(currentUser.getId())
                .orElse(null);

        if (current == null) {
            current = upsertCode(currentUser);
        }

        return mapToResponse(current);
    }

    @Transactional
    public AccessCodeResponse regenerateCode(User currentUser) {
        validatePatientRole(currentUser);
        PatientAccessCode updated = upsertCode(currentUser);
        return mapToResponse(updated);
    }

    @Transactional
    public void ensureCodeExistsForPatient(User user) {
        if (user.getRole() != Role.PATIENT) {
            return;
        }

        patientAccessCodeRepository.findByPatient_Id(user.getId())
                .orElseGet(() -> upsertCode(user));
    }

    @Transactional(readOnly = true)
    public ValidateAccessCodeResponse validateCode(String code) {
        String normalizedCode = normalizeCode(code);
        return patientAccessCodeRepository.findByCodeValue(normalizedCode)
                .map(existing -> ValidateAccessCodeResponse.builder()
                        .valid(true)
                        .patientId(existing.getPatient().getId())
                        .build())
                .orElseGet(() -> ValidateAccessCodeResponse.builder()
                        .valid(false)
                        .patientId(null)
                        .build());
    }

    private PatientAccessCode upsertCode(User patient) {
        PatientAccessCode accessCode = patientAccessCodeRepository.findByPatient_Id(patient.getId())
                .orElseGet(PatientAccessCode::new);

        accessCode.setPatient(patient);
        accessCode.setCodeValue(generateUniqueCode());
        accessCode.setUpdatedBy("PATIENT_MANUAL");
        accessCode.setExpiresAt(LocalDateTime.now().plusHours(1));

        return patientAccessCodeRepository.save(accessCode);
    }

    private String generateUniqueCode() {
        String candidate;
        do {
            candidate = generateCode();
        } while (patientAccessCodeRepository.existsByCodeValue(candidate));
        return candidate;
    }

    private String generateCode() {
        StringBuilder builder = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            builder.append(ALPHANUM.charAt(secureRandom.nextInt(ALPHANUM.length())));
        }
        return builder.toString();
    }

    private String normalizeCode(String code) {
        if (code == null || code.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Access code is required");
        }
        return code.trim();
    }

    private void validatePatientRole(User user) {
        if (user.getRole() != Role.PATIENT) {
            throw new ResponseStatusException(BAD_REQUEST, "Only patients can manage access code");
        }
    }

    private AccessCodeResponse mapToResponse(PatientAccessCode accessCode) {
        return AccessCodeResponse.builder()
                .patientId(accessCode.getPatient().getId())
                .code(accessCode.getCodeValue())
                .build();
    }
}
