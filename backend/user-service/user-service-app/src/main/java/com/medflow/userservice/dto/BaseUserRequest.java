package com.medflow.userservice.dto;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.medflow.userservice.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@JsonTypeInfo(
        use = JsonTypeInfo.Id.NAME,
        include = JsonTypeInfo.As.EXISTING_PROPERTY,
        property = "role",
        visible = true
)
@JsonSubTypes({
        @JsonSubTypes.Type(value = PatientRequest.class, name = "PATIENT"),
        @JsonSubTypes.Type(value = DoctorRequest.class, name = "DOCTOR"),
        @JsonSubTypes.Type(value = LaboratoryRequest.class, name = "LABO"),
        @JsonSubTypes.Type(value = HospitalRequest.class, name = "HOSPITAL"),
        @JsonSubTypes.Type(value = InsuranceRequest.class, name = "INSURANCE"),
        @JsonSubTypes.Type(value = PharmacistRequest.class, name = "PHARMACIST"),
        @JsonSubTypes.Type(value = DeliveryAgentRequest.class, name = "DELIVERY_AGENT"),
        @JsonSubTypes.Type(value = CentralPharmacyRequest.class, name = "CENTRAL_PHARMACY")
})
public abstract class BaseUserRequest {
    @NotBlank(message = "Email is required", groups = {OnCreate.class, OnUpdate.class})
    @Email(message = "Invalid email format", groups = {OnCreate.class, OnUpdate.class})
    private String email;

    @NotBlank(message = "Password is required", groups = OnCreate.class)
    @Size(min = 8, message = "Password must be at least 8 characters long", groups = OnCreate.class)
    private String password;

    @NotBlank(message = "Phone number is required", groups = {OnCreate.class, OnUpdate.class})
    @Pattern(regexp = "^\\d{8}$", message = "Phone number must be exactly 8 digits", groups = {OnCreate.class, OnUpdate.class})
    private String phoneNumber;

    private String profilePictureUrl;

    @NotNull(message = "Role is required", groups = {OnCreate.class, OnUpdate.class})
    private Role role;
}
