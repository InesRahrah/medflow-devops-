package com.medflow.appointmentservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(
    name = "preconsultation_responses",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_precon_response_appointment", columnNames = "appointment_id")
    },
    indexes = {
        @Index(name = "idx_precon_response_appointment", columnList = "appointment_id")
    }
)
@Getter
@Setter
public class Preconsultation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private PreconQuestionTemplate template;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", referencedColumnName = "idAp", unique = true, nullable = false)
    private Appointment appointment;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "doctor_id")
    private Long doctorId;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    public enum RiskLevel {
        routine, priority, urgent
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level")
    private RiskLevel riskLevel;

    @OneToMany(mappedBy = "response", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PreconsultationAnswer> answers;

    @Transient
    private List<PreconQuestion> questions;

    @Transient
    private String notes;

    // Backward-compatible accessor used in existing mapper/service code.
    public Long getIdP() {
        return id;
    }

    // Backward-compatible mutator used in existing mapper/service code.
    public void setIdP(Long idP) {
        this.id = idP;
    }
}