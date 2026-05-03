package com.vms.controller;

import com.vms.dto.VisitorRegistrationRequest;
import com.vms.dto.VisitorResponse;
import com.vms.service.VisitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import com.vms.security.RateLimitingService;

import java.util.List;

@RestController
@RequestMapping("/api/visitors")
@RequiredArgsConstructor
public class VisitorController {

    private final VisitorService visitorService;
    private final RateLimitingService rateLimitingService;

    @PostMapping("/register")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'ADMIN', 'SECURITY_GUARD')")
    public ResponseEntity<?> registerVisitor(
            @Valid @ModelAttribute VisitorRegistrationRequest request, 
            @RequestParam(value = "file", required = false) MultipartFile file,
            Authentication authentication, 
            HttpServletRequest httpRequest) {
            
        if (!rateLimitingService.resolveBucket(httpRequest.getRemoteAddr()).tryConsume(1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body("Too many registration requests. Please try again later.");
        }
        
        String submitter = authentication.getName();
        boolean hasElevated = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN")) || 
                              authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SECURITY_GUARD"));
        
        String host = hasElevated ? request.getHostUsername() : submitter;
        
        return new ResponseEntity<>(visitorService.registerVisitor(request, host, file), HttpStatus.CREATED);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'ADMIN', 'SECURITY_GUARD')")
    public ResponseEntity<List<VisitorResponse>> getAllVisitors(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String hostId,
            Authentication authentication) {
        
        boolean hasElevatedAccess = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN")) || 
                                    authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_SECURITY_GUARD"));
        String filterHostId = hasElevatedAccess ? hostId : authentication.getName();
        
        return ResponseEntity.ok(visitorService.getAllVisitors(status, date, filterHostId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'ADMIN', 'SECURITY_GUARD', 'VISITOR')")
    public ResponseEntity<VisitorResponse> getVisitorById(@PathVariable String id, Authentication authentication) {
        VisitorResponse visitor = visitorService.getVisitorById(id);
        
        // Security check: Visitors can only see their own requests
        if (authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_VISITOR"))) {
            if (!visitor.getEmail().equals(authentication.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        
        return ResponseEntity.ok(visitor);
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public ResponseEntity<VisitorResponse> approveVisitor(@PathVariable String id, @RequestParam boolean approve) {
        return ResponseEntity.ok(visitorService.approveVisitor(id, approve));
    }

    @PostMapping("/{id}/check-in")
    @PreAuthorize("hasAnyRole('ADMIN', 'SECURITY_GUARD')")
    public ResponseEntity<VisitorResponse> checkIn(@PathVariable String id) {
        return ResponseEntity.ok(visitorService.checkIn(id));
    }

    @PostMapping("/{id}/check-out")
    @PreAuthorize("hasAnyRole('ADMIN', 'SECURITY_GUARD')")
    public ResponseEntity<VisitorResponse> checkOut(@PathVariable String id) {
        return ResponseEntity.ok(visitorService.checkOut(id));
    }

    @PostMapping("/{id}/photo")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'ADMIN', 'SECURITY_GUARD')")
    public ResponseEntity<VisitorResponse> uploadPhoto(@PathVariable String id, @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(visitorService.uploadPhoto(id, file));
    }

    @GetMapping("/my-requests")
    @PreAuthorize("hasRole('VISITOR')")
    public ResponseEntity<List<VisitorResponse>> getMyRequests(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(visitorService.getVisitorRequestsByEmail(email));
    }
}
