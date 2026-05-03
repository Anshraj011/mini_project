package com.vms.service;

import com.vms.dto.DashboardResponse;
import com.vms.dto.VisitorRegistrationRequest;
import com.vms.dto.VisitorResponse;
import com.vms.exception.ResourceNotFoundException;
import com.vms.model.Visitor;
import com.vms.model.VisitorStatus;
import com.vms.repository.UserRepository;
import com.vms.repository.VisitorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VisitorServiceImpl implements VisitorService {

    private final VisitorRepository visitorRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final MongoTemplate mongoTemplate;
    private final FileService fileService;

    @Override
    @CacheEvict(value = "dashboardStats", allEntries = true)
    public VisitorResponse registerVisitor(VisitorRegistrationRequest request, String username, MultipartFile photo) {
        log.info("Registering new visitor by user: {}", username);
        
        if (request.getVisitEndTime().isBefore(request.getExpectedVisitTime())) {
            throw new IllegalArgumentException("Visit end time must be after start time");
        }

        // ── Rule: Pre-approval limit (Admin rule #9) ─────────────────
        if (request.isPreApproval()) {
            LocalDateTime start = LocalDate.now().atStartOfDay();
            LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);
            long count = visitorRepository.countByRegisteredByAndStatusAndCreatedAtBetween(
                username, VisitorStatus.PRE_APPROVED, start, end);
            if (count >= 5) {
                throw new IllegalStateException("You have reached your limit of 5 pre-approved visitors for today.");
            }
        }

        Visitor visitor = new Visitor();
        BeanUtils.copyProperties(request, visitor);
        
        // Ensure host details are correct (especially for public portal)
        if (request.getHostUsername() != null) {
            userRepository.findByUsername(request.getHostUsername()).ifPresent(host -> {
                visitor.setHostUsername(host.getUsername());
                visitor.setHostName(host.getName());
            });
        }

        visitor.setStatus(request.isPreApproval() ? VisitorStatus.PRE_APPROVED : VisitorStatus.PENDING);
        visitor.setRegisteredBy(username);
        visitor.setCreatedAt(LocalDateTime.now());
        visitor.setUpdatedAt(LocalDateTime.now());
        
        if (photo != null && !photo.isEmpty()) {
            String secureUrl = fileService.uploadFile(photo);
            visitor.setPhotoUrl(secureUrl);
        }

        if (visitor.getStatus() == VisitorStatus.PRE_APPROVED) {
            generateQrCode(visitor);
        }
        
        Visitor savedVisitor = visitorRepository.save(visitor);
        
        // Notification to Visitor
        notificationService.sendEmail(request.getEmail(), "Visitor Registration", 
            "Hello " + visitor.getFullName() + ",\n\nYou have been registered for a visit at VMS.\n" +
            "Expected Time: " + visitor.getExpectedVisitTime() + "\n" +
            "Status: " + visitor.getStatus() + (visitor.getQrCodeUrl() != null ? "\nQR Code: " + visitor.getQrCodeUrl() : ""));
        
        // Real-time Host Notification
        if (visitor.getHostUsername() != null && visitor.getStatus() == VisitorStatus.PENDING) {
            userRepository.findByUsername(visitor.getHostUsername()).ifPresent(host -> {
                notificationService.sendEmail(host.getEmail(),
                    "🔔 New Visit Request Awaiting Your Approval",
                    "Hello " + host.getName() + ",\n\n" +
                    "A visitor has requested to visit you and is awaiting your approval.\n\n" +
                    "Visitor Details:\n" +
                    "  • Name    : " + visitor.getFullName() + "\n" +
                    "  • Company : " + visitor.getCompany() + "\n" +
                    "  • Purpose : " + visitor.getPurposeOfVisit() + "\n" +
                    "  • Time    : " + visitor.getExpectedVisitTime() + "\n\n" +
                    "ACTION REQUIRED:\n" +
                    "Log in to your VMS Employee Dashboard to Approve or Reject this request.\n" +
                    "Your dashboard will show this request under 'Pending Approval'.\n\n" +
                    "Request ID: " + savedVisitor.getId() + "\n\n" +
                    "Thank you,\nVMS Team");
            });
        }

        return mapToResponse(savedVisitor);
    }

    private void generateQrCode(Visitor v) {
        String data = String.format("VMS-ID:%s|Host:%s|Window:%s-%s|Status:%s", 
            v.getId() != null ? v.getId() : "TEMP", v.getHostName(), v.getExpectedVisitTime(), v.getVisitEndTime(), v.getStatus());
        v.setQrCodeUrl("https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + data);
    }

    @Override
    @CacheEvict(value = "dashboardStats", allEntries = true)
    public VisitorResponse approveVisitor(String id, boolean isApproved) {
        log.info("Approving/Rejecting visitor with ID: {}, approved: {}", id, isApproved);
        Visitor visitor = visitorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found with id: " + id));
        
        if (visitor.getStatus() != VisitorStatus.PENDING) {
            throw new IllegalStateException("Visitor is not in PENDING state. Current status: " + visitor.getStatus());
        }

        // Approved requests become PRE_APPROVED — this is the pre-approval conversion step.
        // Guard check-in already accepts both PRE_APPROVED and APPROVED.
        visitor.setStatus(isApproved ? VisitorStatus.PRE_APPROVED : VisitorStatus.REJECTED);
        visitor.setUpdatedAt(LocalDateTime.now());
        
        if (isApproved) {
            // QR generated ONLY after approval — enforce this rule.
            generateQrCode(visitor);
        }

        Visitor savedVisitor = visitorRepository.save(visitor);
        
        if (isApproved) {
            String qrImgTag = visitor.getQrCodeUrl() != null
                ? "\n\nYour Digital Pass (QR Code):\n" + visitor.getQrCodeUrl() +
                  "\n\nPresent this QR code or your Request ID at the gate: " + savedVisitor.getId()
                : "";
            notificationService.sendEmail(visitor.getEmail(),
                "✅ Visit Approved — Your Digital Pass is Ready",
                "Hello " + visitor.getFullName() + ",\n\n" +
                "Great news! Your visit request has been APPROVED by " + (visitor.getHostName() != null ? visitor.getHostName() : "the host") + ".\n\n" +
                "Visit Details:\n" +
                "  • Purpose : " + visitor.getPurposeOfVisit() + "\n" +
                "  • Host    : " + (visitor.getHostName() != null ? visitor.getHostName() : "—") + "\n" +
                "  • Date    : " + visitor.getExpectedVisitTime() + "\n" +
                "  • Request ID: " + savedVisitor.getId() + "\n" +
                qrImgTag + "\n\n" +
                "You may now log in to the Visitor Portal with your email and OTP to view your digital pass.\n\n" +
                "Thank you,\nVMS Team");
        } else {
            notificationService.sendEmail(visitor.getEmail(),
                "Visit Request Update",
                "Hello " + visitor.getFullName() + ",\n\n" +
                "Unfortunately, your visit request has been declined.\n\n" +
                "Visit Details:\n" +
                "  • Purpose : " + visitor.getPurposeOfVisit() + "\n" +
                "  • Host    : " + (visitor.getHostName() != null ? visitor.getHostName() : "—") + "\n" +
                "  • Date    : " + visitor.getExpectedVisitTime() + "\n\n" +
                "If you believe this is an error, please contact the host employee directly.\n\n" +
                "Thank you,\nVMS Team");
        }
        
        return mapToResponse(savedVisitor);
    }

    @Override
    @CacheEvict(value = "dashboardStats", allEntries = true)
    public VisitorResponse checkIn(String id) {
        log.info("Checking in visitor with ID: {}", id);
        Visitor visitor = visitorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found with id: " + id));
        
        if (visitor.getStatus() != VisitorStatus.APPROVED && visitor.getStatus() != VisitorStatus.PRE_APPROVED) {
            throw new IllegalStateException("Only APPROVED or PRE_APPROVED visitors can check-in. Current status: " + visitor.getStatus());
        }

        if (visitor.getCheckInTime() != null) {
            throw new IllegalStateException("Visitor has already checked in");
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(visitor.getVisitEndTime())) {
            visitor.setStatus(VisitorStatus.EXPIRED);
            visitorRepository.save(visitor);
            throw new IllegalStateException("Visitor pass has expired");
        }
        
        visitor.setCheckInTime(now);
        visitor.setStatus(VisitorStatus.CHECKED_IN);
        visitor.setUpdatedAt(now);
        
        return mapToResponse(visitorRepository.save(visitor));
    }

    @Override
    @CacheEvict(value = "dashboardStats", allEntries = true)
    public VisitorResponse checkOut(String id) {
        log.info("Checking out visitor with ID: {}", id);
        Visitor visitor = visitorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found with id: " + id));
        
        if (visitor.getStatus() != VisitorStatus.CHECKED_IN) {
            throw new IllegalStateException("Visitor is not currently checked in");
        }
        
        if (visitor.getCheckOutTime() != null) {
            throw new IllegalStateException("Visitor has already checked out");
        }

        visitor.setCheckOutTime(LocalDateTime.now());
        visitor.setStatus(VisitorStatus.CHECKED_OUT);
        visitor.setUpdatedAt(LocalDateTime.now());
        
        return mapToResponse(visitorRepository.save(visitor));
    }

    @Override
    public List<VisitorResponse> getAllVisitors(String status, String date, String hostId) {
        Query query = new Query();
        if (status != null && !status.isEmpty()) {
            query.addCriteria(Criteria.where("status").is(status));
        }
        if (date != null && !date.isEmpty()) {
            LocalDate parsedDate = LocalDate.parse(date);
            LocalDateTime start = parsedDate.atStartOfDay();
            LocalDateTime end = parsedDate.atTime(LocalTime.MAX);
            query.addCriteria(Criteria.where("createdAt").gte(start).lte(end));
        }
        if (hostId != null && !hostId.isEmpty()) {
            query.addCriteria(Criteria.where("hostUsername").is(hostId));
        }
        
        List<Visitor> visitors = mongoTemplate.find(query, Visitor.class);
        return visitors.stream().map(this::mapToResponse).collect(Collectors.toList());
    }
    
    @Override
    public VisitorResponse getVisitorById(String id) {
        Visitor visitor = visitorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found with id: " + id));
        return mapToResponse(visitor);
    }

    @Override
    public VisitorResponse uploadPhoto(String id, MultipartFile file) {
        Visitor visitor = visitorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Visitor not found with id: " + id));

        String secureUrl = fileService.uploadFile(file);

        visitor.setPhotoUrl(secureUrl);
        visitor.setUpdatedAt(LocalDateTime.now());
        
        return mapToResponse(visitorRepository.save(visitor));
    }
    
    @Override
    @Cacheable("dashboardStats")
    public DashboardResponse getDashboardStats() {
        DashboardResponse response = new DashboardResponse();
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        
        response.setTotalVisitorsToday(visitorRepository.countByCreatedAtBetween(startOfDay, endOfDay));
        response.setPendingApprovalsCount(visitorRepository.countByStatus(VisitorStatus.PENDING));
        response.setApprovedVisitorsCount(visitorRepository.countByStatus(VisitorStatus.APPROVED));
        response.setRejectedVisitorsCount(visitorRepository.countByStatus(VisitorStatus.REJECTED));
        
        // For checked-in count, we can do a query where checkInTime is not null and checkOutTime is null
        Query query = new Query();
        query.addCriteria(Criteria.where("checkInTime").exists(true).ne(null));
        query.addCriteria(new Criteria().orOperator(
            Criteria.where("checkOutTime").exists(false),
            Criteria.where("checkOutTime").is(null)
        ));
        long checkedIn = mongoTemplate.count(query, Visitor.class);
        response.setCheckedInVisitorsCount(checkedIn);
        
        return response;
    }

    @Override
    public List<VisitorResponse> getVisitorRequestsByEmail(String email) {
        log.info("Fetching visitor requests for email: {}", email);
        return visitorRepository.findByEmailIgnoreCase(email).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private VisitorResponse mapToResponse(Visitor visitor) {
        VisitorResponse response = new VisitorResponse();
        BeanUtils.copyProperties(visitor, response);
        return response;
    }
}
