package com.medflow.appointmentservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import com.medflow.appointmentservice.entity.converter.StringListJsonConverter;

import java.util.List;

@Entity
@Table(
    name = "preconsultation_questions",
    indexes = {
        @Index(name = "idx_precon_q_template_order", columnList = "template_id, order_index")
    }
)
@Getter
@Setter
public class PreconQuestion {

    public enum QuestionType {
        text, yes_no, single_choice, multi_choice, scale, number
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private PreconQuestionTemplate template;

    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "text", length = 500)
    private String text;

    @Enumerated(EnumType.STRING)
    @Column(name = "type")
    private QuestionType type;

    @Column(name = "required", nullable = false)
    private Boolean required = true;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "options", columnDefinition = "LONGTEXT")
    private List<String> options;

    @Column(name = "scale_min")
    private Integer scaleMin;

    @Column(name = "scale_max")
    private Integer scaleMax;

    @Column(name = "is_red_flag", nullable = false)
    private Boolean isRedFlag = false;

    @Column(name = "red_flag_value", length = 255)
    private String redFlagValue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conditional_parent_id")
    private PreconQuestion conditionalParent;

    @Column(name = "conditional_trigger_value", length = 255)
    private String conditionalTriggerValue;
}