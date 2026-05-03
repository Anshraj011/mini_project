package com.vms.service;

import com.vms.dto.DashboardResponse;
import com.vms.dto.VisitorRegistrationRequest;
import com.vms.dto.VisitorResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface VisitorService {
    VisitorResponse registerVisitor(VisitorRegistrationRequest request, String username, MultipartFile photo);
    VisitorResponse approveVisitor(String id, boolean isApproved);
    VisitorResponse checkIn(String id);
    VisitorResponse checkOut(String id);
    List<VisitorResponse> getAllVisitors(String status, String date, String hostId);
    VisitorResponse getVisitorById(String id);
    VisitorResponse uploadPhoto(String id, MultipartFile file);
    List<VisitorResponse> getVisitorRequestsByEmail(String email);
    DashboardResponse getDashboardStats();
}
