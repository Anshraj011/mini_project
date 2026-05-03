package com.vms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableCaching
@EnableScheduling
@EnableAsync
public class VisitorManagementApplication {

    static {
        loadEnv();
    }

    public static void main(String[] args) {
        SpringApplication.run(VisitorManagementApplication.class, args);
    }

    private static void loadEnv() {
        try {
            java.nio.file.Path envPath = java.nio.file.Paths.get(".env");
            if (java.nio.file.Files.exists(envPath)) {
                java.nio.file.Files.lines(envPath).forEach(line -> {
                    String[] parts = line.split("=", 2);
                    if (parts.length == 2 && !parts[0].trim().startsWith("#")) {
                        System.setProperty(parts[0].trim(), parts[1].trim());
                    }
                });
                System.out.println(".env file loaded successfully");
            }
        } catch (Exception e) {
            System.err.println("Could not load .env file: " + e.getMessage());
        }
    }

}
