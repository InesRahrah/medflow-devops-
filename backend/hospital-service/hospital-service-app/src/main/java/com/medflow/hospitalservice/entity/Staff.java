package com.medflow.hospitalservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;
import java.util.List;
import java.util.ArrayList;

import com.medflow.hospitalservice.entity.enums.EmploymentType;
import com.medflow.hospitalservice.entity.enums.StaffRole;
import com.medflow.hospitalservice.entity.enums.StaffStatus;

@Entity
@Table(name = "staff")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Staff extends BaseEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private UUID userId; // 🔗 external (User Service)

    private String firstName;

    private String lastName;

    @ManyToOne
    @JoinColumn(name = "hospital_id", nullable = false)
    private Hospital hospital;

    @ManyToOne
    @JoinColumn(name = "department_id")
    private Department department;

    @Enumerated(EnumType.STRING)
    private StaffRole role;

    @Enumerated(EnumType.STRING)
    private EmploymentType employmentType;

    @Enumerated(EnumType.STRING)
    private StaffStatus status;

    @ManyToMany(mappedBy = "assignedStaff")
    @Builder.Default
    private List<Room> assignedRooms = new ArrayList<>();
}