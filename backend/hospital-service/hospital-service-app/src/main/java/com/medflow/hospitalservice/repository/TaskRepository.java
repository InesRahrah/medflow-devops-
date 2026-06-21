package com.medflow.hospitalservice.repository;

import com.medflow.hospitalservice.entity.Staff;
import com.medflow.hospitalservice.entity.Task;
import com.medflow.hospitalservice.entity.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findAllByOrderByCreatedAtDesc();
    List<Task> findByAssignedStaffOrderByCreatedAtDesc(Staff assignedStaff);
    List<Task> findByAssignedStaffAndStatusOrderByCreatedAtDesc(Staff assignedStaff, TaskStatus status);
    List<Task> findByAssignedStaffIdOrderByCreatedAtDesc(UUID staffId);
}
