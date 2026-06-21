package com.medflow.hospitalservice.security;

public final class AdminAuthorization {

    private AdminAuthorization() {
    }

    public static final String ADMIN_ROLES = "hasAnyRole('STAFF_ADMIN','HOSPITAL')";
}
