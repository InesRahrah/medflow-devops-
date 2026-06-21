package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.PatientRequest;
import com.medflow.userservice.entity.PatientProfile;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class PatientUpdateStrategy implements UpdateProfileStrategy {
    @Override
    public void updateProfile(User user, BaseUserRequest request) {
        PatientRequest patientRequest = (PatientRequest) request;
        PatientProfile profile = user.getPatientProfile();
        
        if (profile == null) {
            profile = PatientProfile.builder().user(user).build();
            user.setPatientProfile(profile);
        }

        Optional.ofNullable(patientRequest.getFirstName()).ifPresent(profile::setFirstName);
        Optional.ofNullable(patientRequest.getLastName()).ifPresent(profile::setLastName);
        Optional.ofNullable(patientRequest.getDateOfBirth()).ifPresent(profile::setDateOfBirth);
        Optional.ofNullable(patientRequest.getGender()).ifPresent(profile::setGender);
        Optional.ofNullable(patientRequest.getBloodType()).ifPresent(profile::setBloodType);
        Optional.ofNullable(patientRequest.getAllergies()).ifPresent(profile::setAllergies);
        Optional.ofNullable(patientRequest.getChronicDiseases()).ifPresent(profile::setChronicDiseases);
        Optional.ofNullable(patientRequest.getHeight()).ifPresent(profile::setHeight);
        Optional.ofNullable(patientRequest.getWeight()).ifPresent(profile::setWeight);
        Optional.ofNullable(patientRequest.getEmergencyContactName()).ifPresent(profile::setEmergencyContactName);
        Optional.ofNullable(patientRequest.getEmergencyContactPhone()).ifPresent(profile::setEmergencyContactPhone);
        Optional.ofNullable(patientRequest.getInsuranceId()).ifPresent(profile::setInsuranceId);
        Optional.ofNullable(patientRequest.getPrimaryDoctorId()).ifPresent(profile::setPrimaryDoctorId);
    }

    @Override
    public Role getRole() {
        return Role.PATIENT;
    }
}
