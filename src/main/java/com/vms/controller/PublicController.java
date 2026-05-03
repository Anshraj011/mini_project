package com.vms.controller;

import com.vms.dto.AuthResponse;
import com.vms.dto.PublicEmployeeResponse;
import com.vms.dto.VisitorRegistrationRequest;
import com.vms.dto.VisitorResponse;
import com.vms.model.Role;
import com.vms.repository.UserRepository;
import com.vms.security.JwtUtil;
import com.vms.service.OtpService;
import com.vms.service.VisitorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
@Slf4j
public class PublicController {

    private final UserRepository userRepository;
    private final VisitorService visitorService;
    private final OtpService otpService;
    private final JwtUtil jwtUtil;
    private final com.vms.service.NotificationService notificationService;

    @GetMapping("/test-email")
    public ResponseEntity<?> testEmail(@RequestParam String email) {
        log.info("Test email request for: {}", email);
        notificationService.sendEmail(email, "VMS Test Email", "If you receive this, the VMS Email system is working correctly.");
        return ResponseEntity.ok(Map.of("message", "Test email sent to " + email + ". Check logs for status."));
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        try {
            Map<String, String> result = otpService.generateOtp(email);
            log.info("OTP for {}: {}", email, result.get("otp")); // In real app, send via email
            return ResponseEntity.ok(Map.of("message", "OTP sent to " + email, "requestId", result.get("requestId")));
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        String requestId = request.get("requestId");
        
        try {
            if (otpService.verifyOtp(email, otp, requestId)) {
                String token = jwtUtil.generateVisitorToken(email);
                return ResponseEntity.ok(new AuthResponse(token, "ROLE_VISITOR", "Visitor", email));
            } else {
                return ResponseEntity.status(401).body(Map.of("message", "Invalid OTP"));
            }
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/employees")
    public ResponseEntity<List<PublicEmployeeResponse>> getPublicEmployees() {
        log.info("Public request: fetching employee list");
        List<PublicEmployeeResponse> employees = userRepository.findByRole(Role.EMPLOYEE).stream()
            .map(u -> {
                PublicEmployeeResponse res = new PublicEmployeeResponse();
                res.setName(u.getName());
                res.setUsername(u.getUsername());
                res.setDepartment(u.getDepartment());
                return res;
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(employees);
    }

    @PostMapping("/visitor-request")
    public ResponseEntity<VisitorResponse> submitPublicRequest(
            @Valid @ModelAttribute VisitorRegistrationRequest request,
            @RequestParam(value = "file", required = false) MultipartFile photo) {
        log.info("Public request: visitor submission for host {}", request.getHostUsername());
        VisitorResponse response = visitorService.registerVisitor(request, "PUBLIC_PORTAL", photo);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/visitor-status/{requestId}")
    public ResponseEntity<?> getVisitorStatus(@PathVariable String requestId) {
        try {
            VisitorResponse visitor = visitorService.getVisitorById(requestId);
            return ResponseEntity.ok(visitor);
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("message", "Request not found"));
        }
    }

    @PostMapping("/scan-qr")
    public ResponseEntity<?> scanQr(@RequestBody Map<String, String> request) {
        String requestId = request.get("requestId");
        if (requestId == null || requestId.trim().isEmpty()) {
            return ResponseEntity.status(400).body(Map.of("message", "requestId is required"));
        }
        try {
            VisitorResponse visitor = visitorService.getVisitorById(requestId.trim());
            return ResponseEntity.ok(visitor);
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("message", "Invalid QR code — visitor not found"));
        }
    }
}
