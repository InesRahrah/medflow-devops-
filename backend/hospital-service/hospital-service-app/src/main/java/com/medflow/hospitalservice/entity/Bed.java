package com.medflow.hospitalservice.entity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

import com.medflow.hospitalservice.entity.enums.BedStatus;
import com.medflow.hospitalservice.entity.enums.BedType;

@Entity
@Table(name = "beds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bed extends BaseEntity {

    @Id
    @GeneratedValue
    private UUID id;

    private String label;
    
    // Layout Coordinates
    private Double x;
    private Double y;
    private Double width;
    private Double height;

    @Enumerated(EnumType.STRING)
    private BedStatus status;

    @Enumerated(EnumType.STRING)
    private BedType type;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;
}
