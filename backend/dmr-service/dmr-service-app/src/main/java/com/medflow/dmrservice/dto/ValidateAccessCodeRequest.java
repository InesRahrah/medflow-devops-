package com.medflow.dmrservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ValidateAccessCodeRequest {

    @NotBlank
    @Pattern(regexp = "^[A-Za-z0-9]{5}$", message = "Access code must be 5 alphanumeric characters")
    private String accessCode;
}
