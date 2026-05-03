package com.vms.service;

import com.vms.dto.VisitRequestCreateRequest;
import com.vms.dto.VisitRequestResponse;
import com.vms.dto.VisitorResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface VisitRequestService {
    VisitRequestResponse createVisitRequest(VisitRequestCreateRequest request, MultipartFile photo);
    List<VisitRequestResponse> getHostVisitRequests(String username, boolean hasElevatedAccess);
    List<VisitRequestResponse> getVisitRequestsByEmail(String email);
    VisitRequestResponse getVisitRequest(String requestId);
    VisitRequestResponse decideVisitRequest(String requestId, boolean approve, String username, boolean hasElevatedAccess);
    VisitorResponse validateApprovedQr(String requestId);
}
