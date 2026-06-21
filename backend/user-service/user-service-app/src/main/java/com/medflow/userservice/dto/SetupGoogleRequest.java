package com.medflow.userservice.dto;

import com.medflow.userservice.entity.Region;
import com.medflow.userservice.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SetupGoogleRequest {
    private Role role;
    private String phoneNumber;

    // Patient fields
    private String firstName;
    private String lastName;
    private LocalDate dateOfBirth;
    private String gender;
    private String bloodType;
    private Double height;
    private Double weight;

    // Doctor fields
    private String specialization;
    private String licenseNumber;

    // Lab fields
    private String labName;
    private String registrationNumber;
    private String address;
    private String supportedTests;

    // Hospital fields
    private String name;
    private String hospitalType;

    // Insurance fields
    private String companyName;
    private List<String> coverageTypes;

    // Pharmacist fields
    private String pharmacyName;
    private Region region;

    // Delivery
    private String deliveryName;
    private String deliveryZone;
    private String vehicleType;
}
