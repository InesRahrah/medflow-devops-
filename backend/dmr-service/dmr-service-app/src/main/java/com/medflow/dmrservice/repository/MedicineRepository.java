package com.medflow.dmrservice.repository;

import com.medflow.dmrservice.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MedicineRepository extends JpaRepository<Medicine, UUID> {
	List<Medicine> findAllByOrderByNameAsc();
}
