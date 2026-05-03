package com.vms.service;

import com.vms.dto.VisitRequestCreateRequest;
import com.vms.dto.VisitRequestResponse;
import com.vms.dto.VisitorResponse;
import com.vms.exception.ResourceNotFoundException;
import com.vms.model.Role;
import com.vms.model.User;
import com.vms.model.VisitRequest;
import com.vms.model.Visitor;
import com.vms.model.VisitorStatus;
import com.vms.repository.UserRepository;
import com.vms.repository.VisitRequestRepository;
import com.vms.repository.VisitorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VisitRequestServiceImpl implements VisitRequestService {

    private static final String STATUS_PENDING = "Pending";
    private static final String STATUS_APPROVED = "Approved";
    private static final String STATUS_REJECTED = "Rejected";

    private final VisitRequestRepository visitRequestRepository;
    private final VisitorRepository visitorRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final FileService fileService;

    @Override
    public VisitRequestResponse createVisitRequest(VisitRequestCreateRequest request, MultipartFile photo) {
        User host = userRepository.findByUsername(request.getHostEmployeeId())
                .filter(user -> user.getRole() == Role.EMPLOYEE)
                .orElseThrow(() -> new ResourceNotFoundException("Host employee not found"));

        if (request.getVisitEndTime().isBefore(request.getDateTime())) {
            throw new IllegalArgumentException("Visit end time must be after start time");
        }

        VisitRequest visitRequest = new VisitRequest();
        visitRequest.setVisitorName(request.getVisitorName());
        visitRequest.setEmail(request.getEmail());
        visitRequest.setPhone(request.getPhone());
        visitRequest.setCompany(request.getCompany());
        visitRequest.setHostEmployeeId(host.getUsername());
        visitRequest.setHostEmployeeName(host.getName());
        visitRequest.setPurpose(request.getPurpose());
        visitRequest.setDateTime(request.getDateTime());
        visitRequest.setVisitEndTime(request.getVisitEndTime());
        visitRequest.setStatus(STATUS_PENDING);
        visitRequest.setCreatedAt(LocalDateTime.now());
        visitRequest.setUpdatedAt(LocalDateTime.now());

        if (photo != null && !photo.isEmpty()) {
            visitRequest.setPhotoUrl(fileService.uploadFile(photo));
        }

        VisitRequest saved = visitRequestRepository.save(visitRequest);

        notificationService.sendEmail(host.getEmail(),
                "New Visit Request Awaiting Approval",
                "Hello " + host.getName() + ",\n\n" +
                "A visitor has requested to visit you and is awaiting your approval.\n\n" +
                "Visitor Details:\n" +
                "Name: " + saved.getVisitorName() + "\n" +
                "Email: " + saved.getEmail() + "\n" +
                "Phone: " + saved.getPhone() + "\n" +
                "Company: " + saved.getCompany() + "\n" +
                "Purpose: " + saved.getPurpose() + "\n" +
                "Start Time: " + saved.getDateTime() + "\n" +
                "End Time: " + saved.getVisitEndTime() + "\n\n" +
                "Request ID: " + saved.getRequestId() + "\n\n" +
                "Log in to your VMS Employee Dashboard to approve or reject this request.");

        notificationService.sendEmail(saved.getEmail(),
                "Visit Request Submitted",
                "Hello " + saved.getVisitorName() + ",\n\n" +
                "Your visit request has been submitted and is awaiting approval from " + saved.getHostEmployeeName() + ".\n\n" +
                "Request ID: " + saved.getRequestId() + "\n" +
                "Status: " + saved.getStatus() + "\n\n" +
                "You will receive a QR code only after your host approves the request.");

        return mapToResponse(saved);
    }

    @Override
    public List<VisitRequestResponse> getHostVisitRequests(String username, boolean hasElevatedAccess) {
        List<VisitRequest> requests = hasElevatedAccess
                ? visitRequestRepository.findAll()
                : visitRequestRepository.findByHostEmployeeId(username);

        return requests.stream()
                .sorted(Comparator.comparing(VisitRequest::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<VisitRequestResponse> getVisitRequestsByEmail(String email) {
        return visitRequestRepository.findByEmailIgnoreCase(email).stream()
                .sorted(Comparator.comparing(VisitRequest::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public VisitRequestResponse getVisitRequest(String requestId) {
        return mapToResponse(findVisitRequest(requestId));
    }

    @Override
    @CacheEvict(value = "dashboardStats", allEntries = true)
    public VisitRequestResponse decideVisitRequest(String requestId, boolean approve, String username, boolean hasElevatedAccess) {
        VisitRequest visitRequest = findVisitRequest(requestId);
        if (!hasElevatedAccess && !username.equals(visitRequest.getHostEmployeeId())) {
            throw new IllegalStateException("You can only approve or reject requests assigned to you");
        }
        if (!STATUS_PENDING.equals(visitRequest.getStatus())) {
            throw new IllegalStateException("Visit request is not Pending. Current status: " + visitRequest.getStatus());
        }

        LocalDateTime now = LocalDateTime.now();
        visitRequest.setStatus(approve ? STATUS_APPROVED : STATUS_REJECTED);
        visitRequest.setDecisionAt(now);
        visitRequest.setUpdatedAt(now);

        if (approve) {
            Visitor visitor = createPreApprovedVisitor(visitRequest, now);
            visitRequest.setPreApprovedVisitorId(visitor.getId());
            visitRequest.setQrCodeUrl(visitor.getQrCodeUrl());
        }

        VisitRequest saved = visitRequestRepository.save(visitRequest);
        sendDecisionEmail(saved, approve);
        return mapToResponse(saved);
    }

    @Override
    public VisitorResponse validateApprovedQr(String requestId) {
        VisitRequest visitRequest = findVisitRequest(extractRequestId(requestId));
        if (!STATUS_APPROVED.equals(visitRequest.getStatus())) {
            throw new IllegalStateException("Entry denied. Visit request status is " + visitRequest.getStatus() + ".");
        }
        if (visitRequest.getPreApprovedVisitorId() == null) {
            throw new IllegalStateException("Entry denied. Approved request has not been converted to a pre-approved visit.");
        }

        Visitor visitor = visitorRepository.findById(visitRequest.getPreApprovedVisitorId())
                .orElseThrow(() -> new ResourceNotFoundException("Pre-approved visitor not found"));

        VisitorResponse response = new VisitorResponse();
        BeanUtils.copyProperties(visitor, response);
        return response;
    }

    private Visitor createPreApprovedVisitor(VisitRequest visitRequest, LocalDateTime now) {
        Visitor visitor = new Visitor();
        visitor.setFullName(visitRequest.getVisitorName());
        visitor.setEmail(visitRequest.getEmail());
        visitor.setPhone(visitRequest.getPhone());
        visitor.setCompany(visitRequest.getCompany());
        visitor.setPurposeOfVisit(visitRequest.getPurpose());
        visitor.setHostUsername(visitRequest.getHostEmployeeId());
        visitor.setHostName(visitRequest.getHostEmployeeName());
        visitor.setRegisteredBy(visitRequest.getHostEmployeeId());
        visitor.setVisitRequestId(visitRequest.getRequestId());
        visitor.setStatus(VisitorStatus.PRE_APPROVED);
        visitor.setPhotoUrl(visitRequest.getPhotoUrl());
        visitor.setExpectedVisitTime(visitRequest.getDateTime());
        visitor.setVisitEndTime(visitRequest.getVisitEndTime());
        visitor.setCreatedAt(now);
        visitor.setUpdatedAt(now);
        visitor.setQrCodeUrl(generateQrCodeUrl(visitRequest.getRequestId()));
        return visitorRepository.save(visitor);
    }

    private void sendDecisionEmail(VisitRequest visitRequest, boolean approve) {
        if (approve) {
            notificationService.sendEmail(visitRequest.getEmail(),
                    "Visit Approved - Your QR Pass is Ready",
                    "Hello " + visitRequest.getVisitorName() + ",\n\n" +
                    "Your visit request has been approved by " + visitRequest.getHostEmployeeName() + ".\n\n" +
                    "Request ID: " + visitRequest.getRequestId() + "\n" +
                    "Date & Time: " + visitRequest.getDateTime() + "\n" +
                    "QR Code: " + visitRequest.getQrCodeUrl() + "\n\n" +
                    "Present this QR code at the gate for pre-approved entry.");
        } else {
            notificationService.sendEmail(visitRequest.getEmail(),
                    "Visit Request Rejected",
                    "Hello " + visitRequest.getVisitorName() + ",\n\n" +
                    "Your visit request for " + visitRequest.getDateTime() + " has been rejected by the host.\n\n" +
                    "Request ID: " + visitRequest.getRequestId());
        }
    }

    private String generateQrCodeUrl(String requestId) {
        String data = "VMS-REQUEST-ID:" + requestId;
        return "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" +
                URLEncoder.encode(data, StandardCharsets.UTF_8);
    }

    private String extractRequestId(String rawRequestId) {
        if (rawRequestId == null || rawRequestId.trim().isEmpty()) {
            throw new IllegalStateException("requestId is required");
        }
        String value = rawRequestId.trim();
        if (value.startsWith("VMS-REQUEST-ID:")) {
            return value.substring("VMS-REQUEST-ID:".length()).trim();
        }
        return value;
    }

    private VisitRequest findVisitRequest(String requestId) {
        return visitRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Visit request not found with id: " + requestId));
    }

    private VisitRequestResponse mapToResponse(VisitRequest visitRequest) {
        VisitRequestResponse response = new VisitRequestResponse();
        BeanUtils.copyProperties(visitRequest, response);
        return response;
    }
}
