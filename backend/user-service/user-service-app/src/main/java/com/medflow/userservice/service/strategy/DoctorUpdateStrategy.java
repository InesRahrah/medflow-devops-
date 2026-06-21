package com.medflow.userservice.service.strategy;

import com.medflow.userservice.dto.BaseUserRequest;
import com.medflow.userservice.dto.DoctorRequest;
import com.medflow.userservice.entity.DoctorProfile;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class DoctorUpdateStrategy implements UpdateProfileStrategy {
    @Override
    public void updateProfile(User user, BaseUserRequest request) {
        DoctorRequest doctorRequest = (DoctorRequest) request;
        DoctorProfile profile = user.getDoctorProfile();

        if (profile == null) {
            profile = DoctorProfile.builder().user(user).build();
            user.setDoctorProfile(profile);
        }

        Optional.ofNullable(doctorRequest.getFirstName()).ifPresent(profile::setFirstName);
        Optional.ofNullable(doctorRequest.getLastName()).ifPresent(profile::setLastName);
        Optional.ofNullable(doctorRequest.getSpecialization()).ifPresent(profile::setSpecialization);
        Optional.ofNullable(doctorRequest.getLicenseNumber()).ifPresent(profile::setLicenseNumber);
        Optional.ofNullable(doctorRequest.getYearsOfExperience()).ifPresent(profile::setYearsOfExperience);
        Optional.ofNullable(doctorRequest.getConsultationFee()).ifPresent(profile::setConsultationFee);
        Optional.ofNullable(doctorRequest.getBiography()).ifPresent(profile::setBiography);
        Optional.ofNullable(doctorRequest.getClinicAddress()).ifPresent(profile::setClinicAddress);
        Optional.ofNullable(doctorRequest.getHospitalId()).ifPresent(profile::setHospitalId);
        Optional.ofNullable(doctorRequest.getAvailabilitySchedule()).ifPresent(profile::setAvailabilitySchedule);
    }

    @Override
    public Role getRole() {
        return Role.DOCTOR;
    }
}
