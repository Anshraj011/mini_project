package com.vms.config;

import com.vms.model.Role;
import com.vms.model.User;
import com.vms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "vms.seed.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        log.info("Running DataSeeder — ensuring all required users exist...");
        
        // Always wipe stale/old users and re-seed so roles are always correct
        userRepository.deleteAll();
        log.info("Cleared existing users. Re-seeding with correct roles...");

        // ── Admin ──────────────────────────────────────────
        User admin = new User();
        admin.setUsername("Ansh");
        admin.setPassword(passwordEncoder.encode("Ansh@2004"));
        admin.setName("Ansh");
        admin.setEmail("admin@vms.com");
        admin.setDepartment("Administration");
        admin.setRole(Role.ADMIN);
        userRepository.save(admin);

        // ── Security Guard ─────────────────────────────────
        User guard = new User();
        guard.setUsername("guard1");
        guard.setPassword(passwordEncoder.encode("guard123"));
        guard.setName("Ramesh Kumar");
        guard.setEmail("ramesh.kumar@vms.com");
        guard.setDepartment("Security");
        guard.setRole(Role.SECURITY_GUARD);
        userRepository.save(guard);

        // ── Host Employees ─────────────────────────────────
        User emp1 = new User();
        emp1.setUsername("amit.sharma");
        emp1.setPassword(passwordEncoder.encode("emp123"));
        emp1.setName("Amit Sharma");
        emp1.setEmail("amit.sharma@vms.com");
        emp1.setDepartment("Engineering");
        emp1.setRole(Role.EMPLOYEE);
        userRepository.save(emp1);

        User emp2 = new User();
        emp2.setUsername("priya.patel");
        emp2.setPassword(passwordEncoder.encode("emp123"));
        emp2.setName("Priya Patel");
        emp2.setEmail("priya.patel@vms.com");
        emp2.setDepartment("Human Resources");
        emp2.setRole(Role.EMPLOYEE);
        userRepository.save(emp2);

        User emp3 = new User();
        emp3.setUsername("rahul.verma");
        emp3.setPassword(passwordEncoder.encode("emp123"));
        emp3.setName("Rahul Verma");
        emp3.setEmail("rahul.verma@vms.com");
        emp3.setDepartment("Sales");
        emp3.setRole(Role.EMPLOYEE);
        userRepository.save(emp3);

        User emp4 = new User();
        emp4.setUsername("neha.gupta");
        emp4.setPassword(passwordEncoder.encode("emp123"));
        emp4.setName("Neha Gupta");
        emp4.setEmail("neha.gupta@vms.com");
        emp4.setDepartment("Finance");
        emp4.setRole(Role.EMPLOYEE);
        userRepository.save(emp4);

        User emp5 = new User();
        emp5.setUsername("vikram.singh");
        emp5.setPassword(passwordEncoder.encode("emp123"));
        emp5.setName("Vikram Singh");
        emp5.setEmail("vikram.singh@vms.com");
        emp5.setDepartment("Marketing");
        emp5.setRole(Role.EMPLOYEE);
        userRepository.save(emp5);

        log.info("✅ Seeded: 1 Admin | 1 Security Guard | 5 Employees");
    }
}
