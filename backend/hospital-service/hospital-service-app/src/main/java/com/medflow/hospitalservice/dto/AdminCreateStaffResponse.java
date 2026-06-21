package com.medflow.hospitalservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminCreateStaffResponse {

    private StaffResponse staff;
    private boolean passwordGenerated;
    private String generatedPassword;
}
