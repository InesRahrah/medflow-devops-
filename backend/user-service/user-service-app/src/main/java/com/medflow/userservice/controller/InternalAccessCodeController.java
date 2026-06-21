package com.medflow.userservice.controller;

import com.medflow.userservice.dto.ValidateAccessCodeRequest;
import com.medflow.userservice.dto.ValidateAccessCodeResponse;
import com.medflow.userservice.service.PatientAccessCodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal/access-codes")
@RequiredArgsConstructor
public class InternalAccessCodeController {

    private final PatientAccessCodeService patientAccessCodeService;

    @PostMapping("/validate")
    public ResponseEntity<ValidateAccessCodeResponse> validate(@Valid @RequestBody ValidateAccessCodeRequest request) {
        return ResponseEntity.ok(patientAccessCodeService.validateCode(request.getCode()));
    }
}
