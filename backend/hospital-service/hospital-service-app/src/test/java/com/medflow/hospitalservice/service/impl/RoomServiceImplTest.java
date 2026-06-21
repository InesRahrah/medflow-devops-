package com.medflow.hospitalservice.service.impl;

import com.medflow.hospitalservice.entity.Room;
import com.medflow.hospitalservice.entity.enums.RoomType;
import com.medflow.hospitalservice.exception.BadRequestException;
import com.medflow.hospitalservice.repository.BedRepository;
import com.medflow.hospitalservice.repository.RoomRepository;
import com.medflow.hospitalservice.security.JwtClaimsExtractor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RoomServiceImplTest {

    @Mock
    private RoomRepository repository;

    @Mock
    private BedRepository bedRepository;

    @Mock
    private JwtClaimsExtractor jwtClaimsExtractor;

    @InjectMocks
    private RoomServiceImpl roomService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void create_ICU_WithInvalidCapacity_ThrowsException() {
        Room room = Room.builder()
                .type(RoomType.ICU)
                .capacity(2)
                .build();

        assertThrows(BadRequestException.class, () -> roomService.create(room));
    }

    @Test
    void create_OR_WithBeds_ThrowsException() {
        Room room = Room.builder()
                .type(RoomType.OR)
                .capacity(1)
                .build();

        assertThrows(BadRequestException.class, () -> roomService.create(room));
    }

    @Test
    void update_ToTypeWithFewerBedsThanCurrent_ThrowsException() {
        UUID roomId = UUID.randomUUID();
        UUID hospitalId = UUID.randomUUID();
        Room existing = Room.builder().id(roomId).type(RoomType.Normal).capacity(3).build();
        Room updateRequest = Room.builder().type(RoomType.ICU).capacity(1).build();

        when(jwtClaimsExtractor.getHospitalId()).thenReturn(hospitalId);
        when(repository.findByIdAndHospitalId(roomId, hospitalId)).thenReturn(java.util.Optional.of(existing));
        when(bedRepository.countByRoom(existing)).thenReturn(2L); // 2 beds currently

        assertThrows(BadRequestException.class, () -> roomService.update(roomId, updateRequest));
    }
}
