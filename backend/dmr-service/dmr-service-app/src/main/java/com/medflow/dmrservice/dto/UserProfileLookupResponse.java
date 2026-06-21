package com.medflow.dmrservice.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class UserProfileLookupResponse {
    private UUID id;
    private String email;
    private String role;
    private String firstName;
    private String lastName;
    private String name;
    private String labName;
    private String companyName;
    private String supportedTests;
}
