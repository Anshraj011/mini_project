package com.vms.controller;

import com.vms.dto.DashboardResponse;
import com.vms.service.VisitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final VisitorService visitorService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DashboardResponse> getDashboard() {
        return ResponseEntity.ok(visitorService.getDashboardStats());
    }
}
