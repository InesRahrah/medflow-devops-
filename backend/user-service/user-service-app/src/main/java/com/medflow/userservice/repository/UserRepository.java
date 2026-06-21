
package com.medflow.userservice.repository;

import com.medflow.userservice.entity.Role;
import com.medflow.userservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import com.medflow.userservice.entity.UserStatus;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findAllByRole(Role role);

    @Query("SELECT DISTINCT LOWER(TRIM(d.specialization)) FROM DoctorProfile d WHERE d.specialization IS NOT NULL AND d.specialization <> ''")
    List<String> findAllUniqueSpecializations();

    @EntityGraph(attributePaths = {"doctorProfile"})
    List<User> findByRole(Role role);

    @EntityGraph(attributePaths = {"doctorProfile"})
    List<User> findByRoleAndStatus(Role role, UserStatus status);

    @Query("SELECT u FROM User u JOIN u.doctorProfile d WHERE u.role = :role AND (:specialty IS NULL OR LOWER(d.specialization) = LOWER(:specialty))")
    List<User> findByRoleAndSpecialty(@Param("role") Role role, @Param("specialty") String specialty);
}
