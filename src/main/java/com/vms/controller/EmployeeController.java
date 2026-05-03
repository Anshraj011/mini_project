package com.vms.controller;

import com.vms.model.Role;
import com.vms.model.User;
import com.vms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/hosts")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'ADMIN', 'SECURITY_GUARD')")
    public ResponseEntity<List<User>> searchHosts(@RequestParam(required = false) String search) {
        List<User> hosts;
        if (search != null && !search.isEmpty()) {
            hosts = userRepository.findByRoleAndNameContainingIgnoreCase(Role.EMPLOYEE, search);
        } else {
            hosts = userRepository.findByRole(Role.EMPLOYEE);
        }
        // Scrub password
        hosts.forEach(h -> h.setPassword(null));
        return ResponseEntity.ok(hosts);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllEmployees() {
        List<User> employees = userRepository.findByRole(Role.EMPLOYEE);
        employees.forEach(e -> e.setPassword(null));
        return ResponseEntity.ok(employees);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> createEmployee(@RequestBody User employee) {
        employee.setRole(Role.EMPLOYEE);
        employee.setPassword(passwordEncoder.encode(employee.getPassword()));
        User saved = userRepository.save(employee);
        saved.setPassword(null);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> updateEmployee(@PathVariable String id, @RequestBody User employeeDetails) {
        User existing = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Employee not found"));
        existing.setName(employeeDetails.getName());
        existing.setEmail(employeeDetails.getEmail());
        existing.setDepartment(employeeDetails.getDepartment());
        if (employeeDetails.getPassword() != null && !employeeDetails.getPassword().isEmpty()) {
            existing.setPassword(passwordEncoder.encode(employeeDetails.getPassword()));
        }
        User updated = userRepository.save(existing);
        updated.setPassword(null);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteEmployee(@PathVariable String id) {
        userRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
