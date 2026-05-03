package com.vms.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class VisitorRegistrationRequest {
    
    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
    private String fullName;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
    
    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be exactly 10 digits")
    private String phone;
    
    @NotBlank(message = "Purpose of visit is required")
    @Size(min = 3, max = 100, message = "Purpose must be between 3 and 100 characters")
    private String purposeOfVisit;

    @NotBlank(message = "Company name is required")
    private String company;
    
    @NotBlank(message = "Host username is required")
    private String hostUsername;
    
    @NotNull(message = "Expected visit time is required")
    @FutureOrPresent(message = "Visit time must not be in the past")
    private LocalDateTime expectedVisitTime;

    @NotNull(message = "Visit end time is required")
    private LocalDateTime visitEndTime;
    
    private boolean isPreApproval;
}
