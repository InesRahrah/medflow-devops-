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
@Table(name = "lab_result")
public class LabResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medical_case_id", nullable = false)
    private MedicalCase medicalCase;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lab_request_id", nullable = false)
    private LabRequest labRequest;

    @Column(nullable = false)
    private UUID laboId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String resultText;

    @Column(length = 600)
    private String resultFileUrl;

    @Column(nullable = false)
    private LocalDateTime resultDate;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
