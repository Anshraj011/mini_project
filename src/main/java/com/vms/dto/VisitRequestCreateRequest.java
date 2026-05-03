package com.vms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class VisitRequestCreateRequest {
    @NotBlank(message = "Visitor name is required")
    @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
    private String visitorName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Phone number is required")
    @jakarta.validation.constraints.Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be exactly 10 digits")
    private String phone;

    @NotBlank(message = "Company name is required")
    private String company;

    @NotBlank(message = "Host employee is required")
    private String hostEmployeeId;

    @NotBlank(message = "Purpose is required")
    @Size(min = 3, max = 100, message = "Purpose must be between 3 and 100 characters")
    private String purpose;

    @NotNull(message = "Visit date and time is required")
    @FutureOrPresent(message = "Visit date and time must not be in the past")
    private LocalDateTime dateTime;

    @NotNull(message = "Visit end time is required")
    private LocalDateTime visitEndTime;
}
