package com.medflow.userservice.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@NoArgsConstructor
public class CentralPharmacyRequest extends BaseUserRequest {
    // rien à ajouter (PCT unique)
}
