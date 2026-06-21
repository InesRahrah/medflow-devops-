package com.medflow.hospitalservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;
import java.util.List;
import java.util.ArrayList;

import com.medflow.hospitalservice.entity.enums.DepartmentStatus;

@Entity
@Table(name = "departments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Department extends BaseEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String description;

    private String color;

    @Enumerated(EnumType.STRING)
    private DepartmentStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospital_id", nullable = false)
    private Hospital hospital;

    @OneToMany(mappedBy = "department", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Room> rooms = new ArrayList<>();
}