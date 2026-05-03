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

        log.info("Seeded: 1 Admin");
    }
}
