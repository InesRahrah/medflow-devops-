package com.medflow.hospitalservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FloorRequest {

    @NotBlank(message = "Floor name is required")
    @Size(min = 3, max = 80, message = "Floor name must be between 3 and 80 characters")
    private String name;

    @NotNull(message = "Floor number is required")
    private Integer floorNumber;
}
