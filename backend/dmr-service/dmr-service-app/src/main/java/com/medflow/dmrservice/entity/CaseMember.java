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
@Table(
        name = "case_member",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_case_member", columnNames = {"medical_case_id", "member_id"})
        }
)
public class CaseMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medical_case_id", nullable = false)
    private MedicalCase medicalCase;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
