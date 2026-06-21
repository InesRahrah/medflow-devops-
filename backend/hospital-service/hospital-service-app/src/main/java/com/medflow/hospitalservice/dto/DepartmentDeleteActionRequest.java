package com.medflow.hospitalservice.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record DepartmentDeleteActionRequest(
        @NotNull DeleteAction action,
        UUID targetDepartmentId) {

    public enum DeleteAction {
        DELETE_CASCADE,
        REASSIGN_AND_DELETE
    }
}
