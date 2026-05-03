package com.vms.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class VisitRequestResponse {
    private String requestId;
    private String visitorName;
    private String email;
    private String phone;
    private String company;
    private String hostEmployeeId;
    private String hostEmployeeName;
    private String purpose;
    private LocalDateTime dateTime;
    private LocalDateTime visitEndTime;
    private String status;
    private String photoUrl;
    private String qrCodeUrl;
    private String preApprovedVisitorId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime decisionAt;
}
