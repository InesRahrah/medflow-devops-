package com.medflow.hospitalservice.mapper;

import com.medflow.hospitalservice.dto.BedRequest;
import com.medflow.hospitalservice.dto.BedResponse;
import com.medflow.hospitalservice.entity.Bed;
import com.medflow.hospitalservice.entity.Room;

public class BedMapper {

    public static Bed toEntity(BedRequest dto, Room room) {
        if (dto == null) {
            return null;
        }

        return Bed.builder()
                .label(dto.getLabel())
                .status(dto.getStatus())
                .x(dto.getX())
                .y(dto.getY())
                .width(dto.getWidth())
                .height(dto.getHeight())
                .type(dto.getType())
                .notes(dto.getNotes())
                .room(room)
                .build();
    }

    public static BedResponse toResponse(Bed entity) {
        if (entity == null) {
            return null;
        }

        return BedResponse.builder()
                .id(entity.getId())
                .label(entity.getLabel())
                .status(entity.getStatus())
                .x(entity.getX())
                .y(entity.getY())
                .width(entity.getWidth())
                .height(entity.getHeight())
                .type(entity.getType())
                .notes(entity.getNotes())
                .roomId(entity.getRoom() != null ? entity.getRoom().getId() : null)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
