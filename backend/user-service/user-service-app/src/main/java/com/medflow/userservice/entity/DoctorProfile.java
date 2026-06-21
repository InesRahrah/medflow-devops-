package com.medflow.userservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "doctor_profiles")
public class DoctorProfile {

    @Id
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    private String firstName;
    private String lastName;
    private String specialization;
    private String licenseNumber;
    private Integer yearsOfExperience;
    private Double consultationFee;

    @Column(columnDefinition = "TEXT")
    private String biography;

    private String clinicAddress;

    private Long hospitalId;

    @Column(columnDefinition = "TEXT")
    private String availabilitySchedule;

    private Boolean isverifiedByAdmin;
}
