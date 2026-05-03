package com.vms.config;

import com.vms.model.Role;
import com.vms.model.User;
import com.vms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private static final String ADMIN_USERNAME = "Ansh";
    private static final String ADMIN_PASSWORD = "Ansh@2004";
    private static final List<String> LEGACY_DEMO_USERS = List.of(
            "admin",
            "guard1",
            "amit.sharma",
            "priya.patel",
            "rahul.verma",
            "neha.gupta",
            "vikram.singh"
    );

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        log.info("Running admin bootstrap...");

        LEGACY_DEMO_USERS.forEach(username ->
                userRepository.findByUsername(username).ifPresent(user -> {
                    userRepository.delete(user);
                    log.info("Removed legacy demo user: {}", username);
                })
        );

        User admin = userRepository.findByUsername(ADMIN_USERNAME).orElseGet(User::new);
        admin.setUsername(ADMIN_USERNAME);
        admin.setPassword(passwordEncoder.encode(ADMIN_PASSWORD));
        admin.setName("Ansh");
        admin.setEmail("admin@vms.com");
        admin.setDepartment("Administration");
        admin.setRole(Role.ADMIN);
        userRepository.save(admin);

        log.info("Admin account ready: {}", ADMIN_USERNAME);
    }
}
