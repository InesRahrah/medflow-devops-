package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.PatientRequest;
import com.medflow.userservice.entity.PatientProfile;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.stereotype.Component;

@Component
public class PatientProfileStrategy implements ProfileStrategy {
    @Override
    public void createProfile(User user, BaseUserRequest request) {
        PatientRequest patientRequest = (PatientRequest) request;
        var profile = PatientProfile.builder()
                .user(user)
                .firstName(patientRequest.getFirstName())
                .lastName(patientRequest.getLastName())
                .dateOfBirth(patientRequest.getDateOfBirth())
                .gender(patientRequest.getGender())
                .bloodType(patientRequest.getBloodType())
                .allergies(patientRequest.getAllergies())
                .chronicDiseases(patientRequest.getChronicDiseases())
                .height(patientRequest.getHeight())
                .weight(patientRequest.getWeight())
                .emergencyContactName(patientRequest.getEmergencyContactName())
                .emergencyContactPhone(patientRequest.getEmergencyContactPhone())
                .insuranceId(patientRequest.getInsuranceId())
                .primaryDoctorId(patientRequest.getPrimaryDoctorId())
                .build();
        user.setPatientProfile(profile);
    }

    @Override
    public Role getRole() {
        return Role.PATIENT;
    }
}
