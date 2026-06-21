package com.medflow.userservice.service.validation;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.DoctorRequest;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.exception.ConflictException;
import com.medflow.userservice.repository.DoctorProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DoctorValidator implements RegistrationValidator {

    private final DoctorProfileRepository doctorProfileRepository;

    @Override
    public void validate(BaseUserRequest request) {
        DoctorRequest doctorRequest = (DoctorRequest) request;
        if (doctorRequest.getLicenseNumber() == null || doctorRequest.getLicenseNumber().isBlank()) {
            throw new IllegalArgumentException("License number is required for doctors");
        }
        if (doctorRequest.getSpecialization() == null || doctorRequest.getSpecialization().isBlank()) {
            throw new IllegalArgumentException("Specialization is required for doctors");
        }

        String licenseNumber = doctorRequest.getLicenseNumber().trim();
        if (doctorProfileRepository.existsByLicenseNumber(licenseNumber)) {
            throw new ConflictException("Doctor license number already exists.");
        }
    }

    @Override
    public Role getRole() {
        return Role.DOCTOR;
    }
}
