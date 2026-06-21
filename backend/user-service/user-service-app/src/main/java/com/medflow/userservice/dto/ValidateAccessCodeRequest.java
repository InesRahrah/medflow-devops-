package com.medflow.userservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ValidateAccessCodeRequest {

    @NotBlank
    @Pattern(regexp = "^[A-Za-z0-9]{5}$", message = "Access code must be 5 alphanumeric characters")
    private String code;
}
