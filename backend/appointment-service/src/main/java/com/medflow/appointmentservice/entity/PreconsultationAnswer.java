package com.medflow.appointmentservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
    name = "preconsultation_answers",
    indexes = {
        @Index(name = "idx_precon_answer_response", columnList = "response_id"),
        @Index(name = "idx_precon_answer_question", columnList = "question_id")
    }
)
@Getter
@Setter
public class PreconsultationAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "response_id", nullable = false)
    private Preconsultation response;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private PreconQuestion question;

    @Lob
    @Column(name = "value", columnDefinition = "TEXT")
    private String value;

    @Column(name = "is_red_flag", nullable = false)
    private Boolean isRedFlag = false;
}
