package com.medflow.hospitalservice.entity.enums;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RoomTypeTest {

    @Test
    void testRoomTypeLimits() {
        assertEquals(1, RoomType.ICU.getMaxBeds());
        assertEquals(3, RoomType.Normal.getMaxBeds());
        assertEquals(0, RoomType.OR.getMaxBeds());
        assertEquals(2, RoomType.EMERGENCY.getMaxBeds());
        assertEquals(-1, RoomType.WARD.getMaxBeds());
    }
}
