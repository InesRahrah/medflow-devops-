package com.medflow.userservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.ALWAYS)
@JsonTypeInfo(
        use = JsonTypeInfo.Id.NAME,
        include = JsonTypeInfo.As.EXISTING_PROPERTY,
        property = "role",
        visible = true
)
@JsonSubTypes({
        @JsonSubTypes.Type(value = PatientUserResponse.class, name = "PATIENT"),
        @JsonSubTypes.Type(value = DoctorUserResponse.class, name = "DOCTOR"),
        @JsonSubTypes.Type(value = LaboratoryUserResponse.class, name = "LABO"),
        @JsonSubTypes.Type(value = HospitalUserResponse.class, name = "HOSPITAL"),
        @JsonSubTypes.Type(value = InsuranceUserResponse.class, name = "INSURANCE"),
        @JsonSubTypes.Type(value = InitialUserResponse.class, name = "INITIAL"),
        @JsonSubTypes.Type(value = PharmacistUserResponse.class, name = "PHARMACIST"),
        @JsonSubTypes.Type(value = DeliveryAgentUserResponse.class, name = "DELIVERY_AGENT"),
        @JsonSubTypes.Type(value = DeliveryAgentUserResponse.class, name = "CENTRAL_PHARMACY")


})
public abstract class BaseUserResponse {
    private UUID id;
    private String email;
    private String phoneNumber;
    private Role role;
    private UserStatus status;
    private boolean verified;
    private boolean setupCompleted;
    private String profilePictureUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastLoginAt;
}
