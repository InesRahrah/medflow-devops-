package com.medflow.dmrservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateMedicineRequest {

    @NotBlank
    private String name;

    private String description;
}
