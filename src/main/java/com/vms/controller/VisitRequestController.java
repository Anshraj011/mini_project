package com.vms.controller;

import com.vms.dto.VisitRequestResponse;
import com.vms.dto.VisitorResponse;
import com.vms.service.VisitRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/visit-requests")
@RequiredArgsConstructor
public class VisitRequestController {

    private final VisitRequestService visitRequestService;

    @GetMapping("/host")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public ResponseEntity<List<VisitRequestResponse>> getHostVisitRequests(Authentication authentication) {
        return ResponseEntity.ok(visitRequestService.getHostVisitRequests(
                authentication.getName(),
                hasElevatedAccess(authentication)));
    }

    @GetMapping("/my-requests")
    @PreAuthorize("hasRole('VISITOR')")
    public ResponseEntity<List<VisitRequestResponse>> getMyVisitRequests(Authentication authentication) {
        return ResponseEntity.ok(visitRequestService.getVisitRequestsByEmail(authentication.getName()));
    }

    @PutMapping("/{requestId}/approval")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public ResponseEntity<VisitRequestResponse> decideVisitRequest(
            @PathVariable String requestId,
            @RequestParam boolean approve,
            Authentication authentication) {
        return ResponseEntity.ok(visitRequestService.decideVisitRequest(
                requestId,
                approve,
                authentication.getName(),
                hasElevatedAccess(authentication)));
    }

    @PostMapping("/scan-qr")
    @PreAuthorize("hasAnyRole('ADMIN', 'SECURITY_GUARD')")
    public ResponseEntity<VisitorResponse> scanApprovedQr(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(visitRequestService.validateApprovedQr(request.get("requestId")));
    }

    private boolean hasElevatedAccess(Authentication authentication) {
        return authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }
}
