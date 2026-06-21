package com.medflow.userservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "insurance_profiles")
public class InsuranceProfile {

    @Id
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    private String companyName;
    private String registrationNumber;
    private String address;

    @ElementCollection
    @CollectionTable(name = "insurance_coverage_types", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "coverage_type")
    private List<String> coverageTypes;

    @Column(columnDefinition = "TEXT")
    private String claimProcessDescription;
}
