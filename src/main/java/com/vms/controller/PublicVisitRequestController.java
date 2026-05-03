package com.vms.controller;

import com.vms.dto.VisitRequestCreateRequest;
import com.vms.dto.VisitRequestResponse;
import com.vms.service.VisitRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/public/visit-requests")
@RequiredArgsConstructor
public class PublicVisitRequestController {

    private final VisitRequestService visitRequestService;

    @PostMapping
    public ResponseEntity<VisitRequestResponse> createVisitRequest(
            @Valid @ModelAttribute VisitRequestCreateRequest request,
            @RequestParam(value = "file", required = false) MultipartFile photo) {
        return new ResponseEntity<>(visitRequestService.createVisitRequest(request, photo), HttpStatus.CREATED);
    }

    @GetMapping("/{requestId}")
    public ResponseEntity<VisitRequestResponse> getVisitRequest(@PathVariable String requestId) {
        return ResponseEntity.ok(visitRequestService.getVisitRequest(requestId));
    }
}
