package com.vms.repository;

import com.vms.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.vms.model.Role;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsername(String username);
    Optional<User> findFirstByUsername(String username);
    List<User> findAllByUsername(String username);
    List<User> findByRole(Role role);
    List<User> findByRoleAndNameContainingIgnoreCase(Role role, String name);
}
