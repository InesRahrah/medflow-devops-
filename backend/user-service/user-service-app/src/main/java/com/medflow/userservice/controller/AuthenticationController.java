package com.medflow.userservice.controller;

import com.medflow.userservice.dto.*;
import com.medflow.userservice.service.AuthenticationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthenticationController {

    private final AuthenticationService service;

    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(
            @Validated(OnCreate.class) @RequestBody BaseUserRequest request
    ) {
        return ResponseEntity.ok(service.register(request));
    }

    @PostMapping("/authenticate")
    public ResponseEntity<AuthenticationResponse> authenticate(
            @RequestBody AuthenticationRequest request
    ) {
        return ResponseEntity.ok(service.authenticate(request));
    }

        @PostMapping("/face/register")
        public ResponseEntity<FaceRegistrationResponse> registerFace(
            @Validated @RequestBody FaceDescriptorRequest request
        ) {
        return ResponseEntity.ok(service.registerFace(request));
        }

        @PostMapping("/face/authenticate")
        public ResponseEntity<AuthenticationResponse> authenticateFace(
            @Validated @RequestBody FaceDescriptorRequest request
        ) {
        return ResponseEntity.ok(service.authenticateFace(request));
        }

    @PostMapping("/google")
    public ResponseEntity<AuthenticationResponse> googleLogin(
            @RequestBody GoogleLoginRequest request
    ) {
        return ResponseEntity.ok(service.googleLogin(request.getToken()));
    }

    @PostMapping("/google/setup")
    public ResponseEntity<AuthenticationResponse> setupGoogle(
            @RequestBody SetupGoogleRequest request,
            java.security.Principal principal
    ) {
        return ResponseEntity.ok(service.setupGoogle(principal.getName(), request));
    }
}
