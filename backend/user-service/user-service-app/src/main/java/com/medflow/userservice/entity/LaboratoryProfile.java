package com.medflow.userservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "laboratory_profiles")
public class LaboratoryProfile {

    @Id
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    private String labName;
    private String registrationNumber;
    private String address;
    private String accreditation;
    private String openingHours;

    @Column(columnDefinition = "TEXT")
    private String supportedTests;

    private Boolean isverifiedByAdmin;
}
