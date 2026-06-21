package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.DoctorRequest;
import com.medflow.userservice.entity.DoctorProfile;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.stereotype.Component;

@Component
public class DoctorProfileStrategy implements ProfileStrategy {
    @Override
    public void createProfile(User user, BaseUserRequest request) {
        DoctorRequest doctorRequest = (DoctorRequest) request;
        var profile = DoctorProfile.builder()
                .user(user)
                .firstName(doctorRequest.getFirstName())
                .lastName(doctorRequest.getLastName())
                .specialization(doctorRequest.getSpecialization())
                .licenseNumber(doctorRequest.getLicenseNumber())
                .yearsOfExperience(doctorRequest.getYearsOfExperience())
                .consultationFee(doctorRequest.getConsultationFee())
                .biography(doctorRequest.getBiography())
                .clinicAddress(doctorRequest.getClinicAddress())
                .hospitalId(doctorRequest.getHospitalId())
                .availabilitySchedule(doctorRequest.getAvailabilitySchedule())
                .isverifiedByAdmin(false)
                .build();
        user.setDoctorProfile(profile);
    }

    @Override
    public Role getRole() {
        return Role.DOCTOR;
    }
}
