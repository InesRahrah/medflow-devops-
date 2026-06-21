package com.medflow.hospitalservice.service.impl;

import com.medflow.hospitalservice.entity.Bed;
import com.medflow.hospitalservice.entity.Room;
import com.medflow.hospitalservice.entity.enums.RoomType;
import com.medflow.hospitalservice.entity.enums.BedStatus;
import com.medflow.hospitalservice.exception.BadRequestException;
import com.medflow.hospitalservice.exception.ResourceNotFoundException;
import com.medflow.hospitalservice.repository.BedRepository;
import com.medflow.hospitalservice.repository.RoomRepository;
import com.medflow.hospitalservice.security.JwtClaimsExtractor;
import com.medflow.hospitalservice.service.BedService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BedServiceImpl implements BedService {

    private final BedRepository repository;
    private final RoomRepository roomRepository;
    private final JwtClaimsExtractor jwtClaimsExtractor;

    @Override
    public Bed create(Bed bed) {
        Room room = resolveRoomInHospital(bed.getRoom());
        enforceRoomCapacityForCreate(room);

        if (bed.getStatus() == null) {
            bed.setStatus(BedStatus.FREE);
        }
        bed.setRoom(room);
        return repository.save(bed);
    }

    @Override
    public List<Bed> getAll() {
        return repository.findByRoom_HospitalId(getRequiredHospitalId());
    }

    @Override
    public List<Bed> getByRoom(Room room) {
        Room validatedRoom = resolveRoomInHospital(room);
        return repository.findByRoomIdAndRoom_HospitalId(validatedRoom.getId(), getRequiredHospitalId());
    }

    @Override
    public Bed getById(UUID id) {
        return repository.findByIdAndRoom_HospitalId(id, getRequiredHospitalId())
                .orElseThrow(() -> new ResourceNotFoundException("Bed not found with id: " + id));
    }

    @Override
    public Bed update(UUID id, Bed bed) {
        Bed existing = getById(id);
        Room room = resolveRoomInHospital(bed.getRoom());
        enforceRoomCapacityForUpdate(room, existing.getId());

        existing.setLabel(bed.getLabel());
        existing.setStatus(bed.getStatus() != null ? bed.getStatus() : BedStatus.FREE);
        existing.setType(bed.getType());
        existing.setNotes(bed.getNotes());
        existing.setX(bed.getX());
        existing.setY(bed.getY());
        existing.setWidth(bed.getWidth());
        existing.setHeight(bed.getHeight());
        existing.setRoom(room);

        return repository.save(existing);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        long deleted = repository.deleteByIdAndRoom_HospitalId(id, getRequiredHospitalId());
        if (deleted == 0) {
            throw new ResourceNotFoundException("Bed not found with id: " + id);
        }
    }

    private UUID getRequiredHospitalId() {
        return jwtClaimsExtractor.getRequiredHospitalId();
    }

    private Room resolveRoomInHospital(Room room) {
        if (room == null || room.getId() == null) {
            throw new BadRequestException("Room is required for bed operation");
        }

        return roomRepository.findByIdAndHospitalId(room.getId(), getRequiredHospitalId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + room.getId()));
    }

    private void enforceRoomCapacityForCreate(Room room) {
        RoomType type = room.getType();
        int maxByType = type != null ? type.getMaxBeds() : -1;
        Integer capacity = room.getCapacity();

        if (type == RoomType.OR) {
            throw new BadRequestException("Operating Rooms (OR) cannot have beds");
        }

        long currentBeds = repository.countByRoom(room);

        if (maxByType != -1 && currentBeds >= maxByType) {
            throw new BadRequestException(type + " rooms are limited to " + maxByType + " bed(s)");
        }

        if (capacity != null && currentBeds >= capacity) {
            throw new BadRequestException("Room is at full capacity. Maximum beds allowed: " + capacity);
        }
    }

    private void enforceRoomCapacityForUpdate(Room room, UUID bedId) {
        RoomType type = room.getType();
        int maxByType = type != null ? type.getMaxBeds() : -1;
        Integer capacity = room.getCapacity();

        if (type == RoomType.OR) {
            throw new BadRequestException("Operating Rooms (OR) cannot have beds");
        }

        long bedsExcludingCurrent = repository.countByRoomAndIdNot(room, bedId);

        if (maxByType != -1 && bedsExcludingCurrent >= maxByType) {
            throw new BadRequestException(type + " rooms are limited to " + maxByType + " bed(s)");
        }

        if (capacity != null && bedsExcludingCurrent >= capacity) {
            throw new BadRequestException("Room is at full capacity. Maximum beds allowed: " + capacity);
        }
    }
}