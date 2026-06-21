package com.medflow.userservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "hospital_profiles")
public class HospitalProfile {

    @Id
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    private String name;
    private String registrationNumber;
    private String address;
    private Boolean isverifiedByAdmin;

    @Enumerated(EnumType.STRING)
    private HospitalType type;

    public enum HospitalType {
        PUBLIC, PRIVATE, CLINIC, SPECIALIZED
    }
}
