package com.vms.service;

import com.vms.model.OtpRecord;
import com.vms.model.VisitRequest;
import com.vms.model.Visitor;
import com.vms.model.VisitorStatus;
import com.vms.repository.OtpRecordRepository;
import com.vms.repository.VisitRequestRepository;
import com.vms.repository.VisitorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {
    private final NotificationService notificationService;
    private final OtpRecordRepository otpRecordRepository;
    private final VisitorRepository visitorRepository;
    private final VisitRequestRepository visitRequestRepository;
    
    @org.springframework.beans.factory.annotation.Value("${otp.expiry.minutes:5}")
    private int otpValidMinutes;

    public Map<String, String> generateOtp(String rawEmail) {
        if (rawEmail == null || rawEmail.trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }
        String email = rawEmail.trim().toLowerCase();

        // Find associated visitor (latest active request)
        List<Visitor> visitors = visitorRepository.findByEmailIgnoreCase(email);
        String requestId = null;
        if (!visitors.isEmpty()) {
            // Find latest active visitor
            Optional<Visitor> latestActive = visitors.stream()
                .filter(v -> v.getStatus() == VisitorStatus.PRE_APPROVED || v.getStatus() == VisitorStatus.APPROVED)
                .max(Comparator.comparing(Visitor::getCreatedAt));
            if (latestActive.isPresent()) {
                requestId = latestActive.get().getId();
            } else {
                requestId = visitors.get(visitors.size() - 1).getId();
            }
        }

        if (requestId == null) {
            requestId = visitRequestRepository.findByEmailIgnoreCase(email).stream()
                .filter(r -> "Pending".equals(r.getStatus()) || "Approved".equals(r.getStatus()))
                .max(Comparator.comparing(VisitRequest::getCreatedAt))
                .map(VisitRequest::getRequestId)
                .orElse(null);
        }

        if (requestId == null) {
            throw new RuntimeException("No active visit request found for this email");
        }

        // Ensure we only keep the latest OTP scoped to requestId
        otpRecordRepository.findByRequestId(requestId).ifPresent(existing -> otpRecordRepository.delete(existing));

        String otp = String.format("%06d", new Random().nextInt(1000000));
        
        OtpRecord record = new OtpRecord();
        record.setRequestId(requestId);
        record.setEmail(email);
        record.setOtp(otp);
        record.setStatus("pending");
        record.setExpiresAt(LocalDateTime.now().plusMinutes(otpValidMinutes));
        otpRecordRepository.save(record);

        log.info("Generated new OTP for email {}. Valid until {}", email, record.getExpiresAt());
        
        notificationService.sendOtpEmail(email, otp);
        
        return Map.of("otp", otp, "requestId", requestId);
    }

    public boolean verifyOtp(String rawEmail, String rawOtp, String rawRequestId) {
        if (rawEmail == null || rawOtp == null || rawRequestId == null || rawRequestId.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing required fields: email, otp, or requestId");
        }

        String email = rawEmail.trim().toLowerCase();
        String otp = rawOtp.trim();
        String requestId = rawRequestId.trim();

        System.out.println("Input: " + email + " " + otp + " " + requestId);

        Optional<OtpRecord> recordOpt = otpRecordRepository.findByRequestId(requestId);
        if (recordOpt.isEmpty()) {
            log.warn("Verification failed: No matching record exists for requestId {}", requestId);
            throw new RuntimeException("Invalid OTP");
        }

        OtpRecord record = recordOpt.get();
        System.out.println("DB Record: " + record.getOtp() + " " + record.getExpiresAt());

        if (LocalDateTime.now().isAfter(record.getExpiresAt())) {
            log.warn("Verification failed: OTP expired for {}", email);
            otpRecordRepository.delete(record);
            throw new RuntimeException("OTP expired");
        }

        boolean isEmailMatch = String.valueOf(email).equals(String.valueOf(record.getEmail()));
        boolean isOtpMatch = String.valueOf(otp).equals(String.valueOf(record.getOtp()));
        
        if (!isEmailMatch || !isOtpMatch) {
            log.warn("Verification failed: Mismatching data for {}", email);
            throw new RuntimeException("Invalid OTP");
        }

        // Mark as verified
        record.setStatus("verified");
        otpRecordRepository.save(record);
        
        // Mark request as checked-in (or active)
        Optional<Visitor> visitorOpt = visitorRepository.findById(requestId);
        if (visitorOpt.isPresent()) {
            Visitor v = visitorOpt.get();
            v.setStatus(VisitorStatus.APPROVED); // Example of activating request
            visitorRepository.save(v);
        }

        log.info("Verification status for {}: Verification successful", email);
        return true;
    }
}
