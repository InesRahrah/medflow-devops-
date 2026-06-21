package com.medflow.dmrservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "lab_request")
public class LabRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medical_case_id", nullable = false)
    private MedicalCase medicalCase;

    @Column(name = "doctor_id")
    private UUID doctorId;

    @Column(name = "labo_id")
    private UUID laboId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LabRequestStatus status;

    @Column(nullable = false, length = 100)
    private String testType;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
