package com.medflow.hospitalservice.entity.enums;

public enum RoomType {
    ICU(1),
    WARD(-1), // Unlimited
    OR(0),
    EMERGENCY(2),
    Normal(3);

    private final int maxBeds;

    RoomType(int maxBeds) {
        this.maxBeds = maxBeds;
    }

    public int getMaxBeds() {
        return maxBeds;
    }
}
