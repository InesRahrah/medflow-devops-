package com.medflow.hospitalservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;
import java.util.List;
import java.util.ArrayList;

import com.medflow.hospitalservice.entity.enums.RoomStatus;
import com.medflow.hospitalservice.entity.enums.RoomType;

@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room extends BaseEntity {

    @Id
    @GeneratedValue
    private UUID id;

    private String roomNumber;
    private Integer capacity;

    // Layout Layout Coordinates
    private Double x;
    private Double y;
    private Double width;
    private Double height;

    @Enumerated(EnumType.STRING)
    private RoomType type;

    @Enumerated(EnumType.STRING)
    private RoomStatus status;

    @ManyToOne
    @JoinColumn(name = "department_id")
    private Department department;

    @ManyToOne
    @JoinColumn(name = "floor_id")
    private Floor floor;

    @ManyToOne
    @JoinColumn(name = "hospital_id")
    private Hospital hospital;

    @ManyToMany
    @JoinTable(
        name = "room_staff",
        joinColumns = @JoinColumn(name = "room_id"),
        inverseJoinColumns = @JoinColumn(name = "staff_id")
    )
    @Builder.Default
    private List<Staff> assignedStaff = new ArrayList<>();

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Bed> beds = new ArrayList<>();
}
