package com.medflow.hospitalservice.service.impl;

import com.medflow.hospitalservice.entity.Department;
import com.medflow.hospitalservice.entity.Floor;
import com.medflow.hospitalservice.entity.Hospital;
import com.medflow.hospitalservice.entity.Room;
import com.medflow.hospitalservice.entity.enums.RoomType;
import com.medflow.hospitalservice.exception.BadRequestException;
import com.medflow.hospitalservice.exception.ResourceNotFoundException;
import com.medflow.hospitalservice.repository.BedRepository;
import com.medflow.hospitalservice.repository.RoomRepository;
import com.medflow.hospitalservice.security.JwtClaimsExtractor;
import com.medflow.hospitalservice.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomServiceImpl implements RoomService {

    private final RoomRepository repository;
    private final BedRepository bedRepository;
    private final JwtClaimsExtractor jwtClaimsExtractor;

    @Override
    public Room create(Room room) {
        validateRoomTypeCapacity(room);
        return repository.save(room);
    }

    @Override
    public List<Room> getAll() {
        return repository.findAll();
    }

    @Override
    public List<Room> getByHospital(Hospital hospital) {
        return repository.findByHospital(hospital);
    }

    @Override
    public List<Room> getByDepartment(Department department) {
        return repository.findByDepartment(department);
    }

    @Override
    public List<Room> getByFloor(Floor floor) {
        return repository.findByFloor(floor);
    }

    @Override
    public Room getById(UUID id) {
        UUID hospitalId = jwtClaimsExtractor.getHospitalId();
        if (hospitalId == null) {
            throw new SecurityException("HospitalId not found in token. Access denied.");
        }

        return repository.findByIdAndHospitalId(id, hospitalId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + id));
    }

    @Override
    public Room update(UUID id, Room room) {
        Room existing = getById(id);

        validateRoomTypeCapacity(room);
        long currentBeds = bedRepository.countByRoom(existing);

        if (room.getCapacity() < currentBeds) {
            throw new BadRequestException("Room capacity cannot be less than current bed count: " + currentBeds);
        }

        int maxAllowed = room.getType().getMaxBeds();
        if (maxAllowed != -1 && currentBeds > maxAllowed) {
            throw new BadRequestException("Cannot change to " + room.getType() + ": room already has " + currentBeds
                    + " beds, but " + room.getType() + " allows only " + maxAllowed);
        }

        existing.setRoomNumber(room.getRoomNumber());
        existing.setCapacity(room.getCapacity());
        existing.setType(room.getType());
        existing.setStatus(room.getStatus());
        existing.setDepartment(room.getDepartment());
        existing.setFloor(room.getFloor());
        existing.setHospital(room.getHospital());
        return repository.save(existing);
    }

    @Override
    public void delete(UUID id) {
        UUID hospitalId = jwtClaimsExtractor.getHospitalId();
        if (hospitalId == null) {
            throw new SecurityException("HospitalId not found in token. Access denied.");
        }

        Room room = repository.findByIdAndHospitalId(id, hospitalId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + id));

        repository.delete(room);
    }

    private void validateRoomTypeCapacity(Room room) {
        RoomType type = room.getType();
        Integer capacity = room.getCapacity();

        if (type == null) {
            throw new BadRequestException("Room type is required");
        }

        if (capacity == null) {
            throw new BadRequestException("Room capacity is required");
        }

        int maxAllowed = type.getMaxBeds();
        if (maxAllowed != -1) {
            if (capacity > maxAllowed) {
                throw new BadRequestException(type + " rooms can only have up to " + maxAllowed + " beds");
            }
        }

        if (type == RoomType.OR && capacity > 0) {
            throw new BadRequestException("Operating Rooms (OR) cannot have beds");
        }

        if (capacity < 1 && type != RoomType.OR) {
            throw new BadRequestException("Room capacity must be at least 1 for " + type + " rooms");
        }
    }
}